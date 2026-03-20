import { openManageClassesDialog } from "./import_classes";

function injectDayButton() {
    if (document.getElementById('cwu-day')) return; // already injected

    const weekBtn = document.getElementById('week');
    if (!weekBtn) return;

    const dayBtn = document.createElement('button');
    dayBtn.type = 'button';
    dayBtn.id = 'cwu-day';
    dayBtn.className = 'btn calendar-button';
    dayBtn.setAttribute('role', 'tab');
    dayBtn.setAttribute('aria-selected', 'false');
    dayBtn.setAttribute('aria-controls', 'calendar-app');
    dayBtn.setAttribute('tabindex', '-1');
    dayBtn.textContent = 'Day';

    weekBtn.parentNode!.insertBefore(dayBtn, weekBtn);

    dayBtn.addEventListener('click', () => {
        document.querySelectorAll('.btn.calendar-button').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
            b.setAttribute('tabindex', '-1');
        });
        dayBtn.classList.add('active');
        dayBtn.setAttribute('aria-selected', 'true');
        dayBtn.setAttribute('tabindex', '0');
        (window as any).jQuery('.calendar.fc').fullCalendar('changeView', 'agendaDay');
        window.setTimeout(() => refreshNowIndicator(), 100);
    });

    ['week', 'month', 'agenda'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            dayBtn.classList.remove('active');
            dayBtn.setAttribute('aria-selected', 'false');
            dayBtn.setAttribute('tabindex', '-1');
            window.setTimeout(() => refreshNowIndicator(), 100);
        });
    });

    document.getElementById('week')?.addEventListener('click', () => {
        try { (window as any).jQuery('.calendar.fc').fullCalendar('changeView', 'agendaWeek'); } catch {}
    });
    document.getElementById('month')?.addEventListener('click', () => {
        try { (window as any).jQuery('.calendar.fc').fullCalendar('changeView', 'month'); } catch {}
    });
}

function injectDayButtonWithRetry() {
    if (document.getElementById('cwu-day')) return;

    const weekBtn = document.getElementById('week');
    if (!weekBtn) {
        // Element not found yet, retry in 300ms
        setTimeout(injectDayButtonWithRetry, 300);
        return;
    }

    injectDayButton();
}

let nowIndicatorRefreshTimer: number | undefined;

function clearCustomNowIndicator() {
    document.querySelectorAll('.cwu-now-indicator-line, .cwu-now-indicator-dot').forEach((el) => el.remove());
}

function ensureNowIndicatorStyles() {
    if (document.getElementById('cwu-now-indicator-styles')) return;

    const style = document.createElement('style');
    style.id = 'cwu-now-indicator-styles';
    style.textContent = `
        .cwu-now-indicator-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: #e03131;
            pointer-events: none;
            z-index: 7;
        }

        .cwu-now-indicator-dot {
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #e03131;
            pointer-events: none;
            z-index: 8;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
        }

        /* White background for day view */
        .calendar.fc .fc-time-grid,
        .calendar.fc .fc-time-grid .fc-bg,
        .calendar.fc .fc-slats,
        .calendar.fc .fc-slat,
        .calendar.fc .fc-widget-content,
        .calendar.fc .fc-day-grid {
            background: white !important;
            background-color: white !important;
            background-image: none !important;
        }

        .calendar.fc .fc-agendaDay-view .fc-today,
        .calendar.fc .fc-agendaDay-view td.fc-today,
        .calendar.fc .fc-agendaDay-view .fc-bg td,
        .calendar.fc .fc-agendaDay-view .fc-day,
        .calendar.fc .fc-agendaDay-view .fc-slats td {
            background: white !important;
            background-color: white !important;
            background-image: none !important;
        }
    `;
    document.head.appendChild(style);
}

function parseMinutes(value: unknown, fallback: number): number {
    if (typeof value === 'string') {
        const [h = '0', m = '0', s = '0'] = value.split(':');
        return parseInt(h, 10) * 60 + parseInt(m, 10) + parseInt(s, 10) / 60;
    }
    if (typeof value === 'number') {
        return value * 60;
    }
    return fallback;
}

function renderFallbackNowIndicator() {
    clearCustomNowIndicator();
    ensureNowIndicatorStyles();

    const jq = (window as any).jQuery;
    if (!jq?.fn?.fullCalendar) return;

    const $cal = jq('.calendar.fc');
    if (!$cal.length) return;

    let viewName = '';
    try {
        const view = $cal.fullCalendar('getView');
        viewName = view?.name || '';
    } catch {
        return;
    }

    // Only add fallback indicator to agendaDay view; agendaWeek already has it
    if (viewName !== 'agendaDay') return;

    const grid = document.querySelector('.calendar.fc .fc-time-grid') as HTMLElement | null;
    const slats = grid?.querySelector('.fc-slats') as HTMLElement | null;
    if (!grid || !slats) return;

    const minMinutes = parseMinutes($cal.fullCalendar('option', 'minTime'), 0);
    const maxMinutes = parseMinutes($cal.fullCalendar('option', 'maxTime'), 24 * 60);
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    if (minutes < minMinutes || minutes > maxMinutes) return;

    grid.style.position = 'relative';

    const slatsOffset = slats.offsetTop;
    const slatsHeight = slats.offsetHeight;
    if (!slatsHeight) return;

    const progress = (minutes - minMinutes) / (maxMinutes - minMinutes);
    const top = slatsOffset + progress * slatsHeight;

    const line = document.createElement('div');
    line.className = 'cwu-now-indicator-line';
    line.style.top = `${top}px`;

    const dot = document.createElement('div');
    dot.className = 'cwu-now-indicator-dot';
    dot.style.left = '0';
    dot.style.top = `${top + 1}px`;

    grid.appendChild(line);
    grid.appendChild(dot);
}

function scheduleNowIndicatorRefresh() {
    if (nowIndicatorRefreshTimer) {
        window.clearTimeout(nowIndicatorRefreshTimer);
    }

    const now = new Date();
    const msUntilNextMinute = ((60 - now.getSeconds()) * 1000) - now.getMilliseconds() + 50;
    nowIndicatorRefreshTimer = window.setTimeout(() => {
        refreshNowIndicator();
    }, msUntilNextMinute);
}

function refreshNowIndicator() {
    const jq = (window as any).jQuery;
    const $cal = jq?.('.calendar.fc');
    if (!$cal?.length || !jq?.fn?.fullCalendar) return;

    let viewName = '';
    try {
        const view = $cal.fullCalendar('getView');
        viewName = view?.name || '';
    } catch {
        return;
    }

    // Only refresh for day view
    if (viewName !== 'agendaDay') {
  
  
        clearCustomNowIndicator();
        return;
    }

    ensureNowIndicatorStyles();

    try {
        $cal.fullCalendar('option', 'nowIndicator', true);
    } catch (e) {
        console.error('Failed to enable now indicator on calendar:', e);
    }

    window.setTimeout(() => {
        const builtInIndicator = document.querySelector('.calendar.fc .fc-now-indicator-line, .calendar.fc .fc-now-indicator-arrow');
        if (!builtInIndicator) {
            renderFallbackNowIndicator();
        } else {
            clearCustomNowIndicator();
        }
        scheduleNowIndicatorRefresh();
    }, 50);
}

export function loadDailyCalendarView() {
    if (document.getElementById('week')) {
        injectDayButtonWithRetry();
        window.setTimeout(() => refreshNowIndicator(), 100);
        return;
    }

    const observer = new MutationObserver(() => {
        if (document.getElementById('week')) {
            injectDayButtonWithRetry();
            window.setTimeout(() => refreshNowIndicator(), 100);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// --- Import Classes button ---

function injectImportClassesButton() {
    if (document.getElementById('cwu-import-classes')) return;

    const createLink = document.getElementById('create_new_event_link');
    if (!createLink || !createLink.parentElement) return;

    const btn = document.createElement('button');
    btn.id = 'cwu-import-classes';
    btn.className = 'btn';
    btn.type = 'button';
    btn.textContent = 'Schedule Course Times';

    createLink.parentElement.insertBefore(btn, createLink);

    btn.addEventListener('click', () => {
        openManageClassesDialog();
    });
}

function injectImportClassesButtonWithRetry() {
    if (document.getElementById('cwu-import-classes')) return;

    const createLink = document.getElementById('create_new_event_link');
    if (!createLink || !createLink.parentElement) {
        // Element not found yet, retry in 300ms
        setTimeout(injectImportClassesButtonWithRetry, 300);
        return;
    }

    injectImportClassesButton();
}

(() => {
    const ensure = () => {
        if (!document.getElementById('cwu-import-classes')) {
            injectImportClassesButtonWithRetry();
        }
        if (!document.getElementById('cwu-day')) {
            injectDayButtonWithRetry();
        }
    };
    ensure();
    let timeout: any;
    const debouncedEnsure = () => { clearTimeout(timeout); timeout = setTimeout(ensure, 150); };
    const obs = new MutationObserver(debouncedEnsure);
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', ensure);
    window.addEventListener('popstate', ensure);
})();

function hashColor(id: number): string {
    const colors = ['#2b8a3e', '#1e6bb8', '#b85c1e', '#8a2be2', '#d6336c', '#0ca678', '#0b7285'];
    return colors[id % colors.length];
}

function colorizeEventsByCoursePrefix() {
    const nodes = document.querySelectorAll('.fc-event, .fc-time-grid-event');
    nodes.forEach((n: any) => {
        const titleNode = n.querySelector('.fc-title') || n.querySelector('.fc-content');
        if (!titleNode) return;
        const m = /\[(\d+)\]/.exec(titleNode.textContent || '');
        if (!m) return;
        const color = hashColor(parseInt(m[1], 10));
        n.style.backgroundColor = color;
        n.style.borderColor = color;
    });
}

(() => {
    const cal = document.querySelector('.calendar.fc');
    if (!cal) return;
    const obs = new MutationObserver(() => colorizeEventsByCoursePrefix());
    obs.observe(cal, { childList: true, subtree: true });
    colorizeEventsByCoursePrefix();
})();