import { startDialog } from "../canvas/dialog";
import { openManageClassesDialog } from "./import_classes";

const DAY_BUTTON_HTML = `<button type="button" id="cwu-day" class="btn calendar-button" role="tab" aria-selected="false" aria-controls="calendar-app" tabindex="-1">Day</button>`;

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
    });

    ['week', 'month', 'agenda'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            dayBtn.classList.remove('active');
            dayBtn.setAttribute('aria-selected', 'false');
            dayBtn.setAttribute('tabindex', '-1');
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

function enableNowIndicator(){
    const jq = (window as any).jQuery;
    const $cal = jq('.calendar.fc');
    if ($cal.fullCalendar('option', 'nowIndicator')) return; // already enabled

    try {
        $cal.fullCalendar('option', 'nowIndicator', true);
    } catch (e) {
        console.error("Failed to enable now indicator on calendar:", e);
    }
}

export function loadDailyCalendarView() {
    if (document.getElementById('week')) {
        injectDayButton();
        enableNowIndicator();
        return;
    }

    const observer = new MutationObserver(() => {
        if (document.getElementById('week')) {
            injectDayButton();
            enableNowIndicator();
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
    btn.textContent = 'Manage classes';

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

// course id prefix "[12345]"
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