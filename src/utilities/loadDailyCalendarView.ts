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
}

export function loadDailyCalendarView() {
    // #agenda is rendered by React after DOMContentLoaded — wait for it
    if (document.getElementById('week')) {
        injectDayButton();
        return;
    }

    const observer = new MutationObserver(() => {
        if (document.getElementById('week')) {
            observer.disconnect();
            injectDayButton();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

