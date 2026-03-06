import { startDialog } from "~src/canvas/dialog";
import { getBaseApiUrl } from "~src/canvas/settings";

function dayCheckbox(id: string, label: string) {
    return `<label style="margin-right:.5em"><input type="checkbox" id="${id}" class="cwu-day"> ${label}</label>`;
}

const IMPORT_DIALOG_HTML = `
  <div id="cwu-import-classes" style="padding:8px">
    <div id="cwu-import-alert" class="alert alert-info" style="display:none"></div>
    <div class="row" style="margin-bottom:8px">
      <div class="col-md-12">
        <strong>Pattern</strong><br/>
        <label style="margin-right:1em"><input type="radio" name="cwu-pattern" value="mwf" checked> Mon/Wed/Fri (55 min)</label>
        <label style="margin-right:1em"><input type="radio" name="cwu-pattern" value="tuth"> Tue/Thu (80 min)</label>
        <label><input type="radio" name="cwu-pattern" value="custom"> Custom</label>
      </div>
    </div>
    <div class="row" style="margin-bottom:8px">
      <div class="col-md-12">
        <strong>Days</strong><br/>
        ${dayCheckbox('cwu-mon','Mon')}
        ${dayCheckbox('cwu-tue','Tue')}
        ${dayCheckbox('cwu-wed','Wed')}
        ${dayCheckbox('cwu-thu','Thu')}
        ${dayCheckbox('cwu-fri','Fri')}
        ${dayCheckbox('cwu-sat','Sat')}
        ${dayCheckbox('cwu-sun','Sun')}
      </div>
    </div>
    <div class="row" style="margin-bottom:8px">
      <div class="col-md-4">
        <label><strong>Start time</strong><br/>
          <input type="time" id="cwu-start-time" class="form-control" value="09:00">
        </label>
      </div>
      <div class="col-md-4">
        <label><strong>Duration (minutes)</strong><br/>
          <input type="number" id="cwu-duration" class="form-control" min="15" step="5" value="55">
        </label>
      </div>
      <div class="col-md-4">
        <label><strong>Location (optional)</strong><br/>
          <input type="text" id="cwu-location" class="form-control" placeholder="e.g. Smith 201">
        </label>
      </div>
    </div>
    <div class="row" style="margin-bottom:8px">
      <div class="col-md-6">
        <label><strong>Start date</strong><br/>
          <input type="date" id="cwu-start-date" class="form-control">
        </label>
      </div>
      <div class="col-md-6">
        <label><strong>End date</strong><br/>
          <input type="date" id="cwu-end-date" class="form-control">
        </label>
      </div>
    </div>
    <div class="row" style="margin-top:8px">
      <div class="col-md-12">
        <button id="cwu-preview-import" class="btn btn-primary">Continue</button>
      </div>
    </div>

    <hr/>
    <div id="cwu-courses-step" style="display:none">
      <h3>Select courses</h3>
      <div id="cwu-courses-list">Loading courses…</div>
      <div style="margin-top:8px">
        <button id="cwu-create-events" class="btn btn-success">Create events</button>
      </div>
    </div>
  </div>
`;

function setPatternDefaults(pattern: 'mwf'|'tuth'|'custom') {
  const $ = window as any as { jQuery: any };
  const jq = (window as any).jQuery || (window as any).$;
  const check = (id: string, on: boolean) => jq(`#${id}`).prop('checked', on);
  if (pattern === 'mwf') {
    check('cwu-mon', true); check('cwu-wed', true); check('cwu-fri', true);
    check('cwu-tue', false); check('cwu-thu', false); check('cwu-sat', false); check('cwu-sun', false);
    jq('#cwu-duration').val(55);
  } else if (pattern === 'tuth') {
    check('cwu-mon', false); check('cwu-wed', false); check('cwu-fri', false);
    check('cwu-tue', true); check('cwu-thu', true); check('cwu-sat', false); check('cwu-sun', false);
    jq('#cwu-duration').val(80);
  }
}

function initDefaults() {
  const jq = (window as any).jQuery || (window as any).$;
  // Default dates: start = next Monday; end = start + 12 weeks (placeholder; user can change)
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const deltaToMon = (8 - (day === 0 ? 7 : day)) % 7; // days to next Mon (0 if today Mon)
  const start = new Date(today);
  start.setDate(start.getDate() + deltaToMon);
  const end = new Date(start);
  end.setDate(end.getDate() + 84);
  const toYMD = (d: Date) => d.toISOString().slice(0,10);
  jq('#cwu-start-date').val(toYMD(start));
  jq('#cwu-end-date').val(toYMD(end));
  setPatternDefaults('mwf');
}

export function openImportClassesDialog() {
  const dlg = startDialog('Import classes', IMPORT_DIALOG_HTML);
  const jq = (window as any).jQuery || (window as any).$;
  initDefaults();
  jq('input[name="cwu-pattern"]').on('change', function(this: HTMLInputElement){
    setPatternDefaults(this.value as any);
  });

  jq('#cwu-preview-import').on('click', () => {
    // Show courses step
    jq('#cwu-courses-step').show();
    loadCoursesList();
  });
}

type CourseLite = { id: number; name: string; course_code?: string };
let COURSE_INDEX: Record<number, CourseLite> = {};

async function fetchStudentCourses(): Promise<CourseLite[]> {
  return new Promise((resolve, reject) => {
    const url = getBaseApiUrl() + 'courses';
    // Filter to active student enrollments; Canvas paginates but default is fine for typical loads
    $.getJSON(url, {
      enrollment_state: 'active',
      enrollment_type: 'student',
      include: ['term']
    }).done((data) => {
      const courses = (data || []).map((c: any) => ({ id: c.id, name: c.name, course_code: c.course_code }));
      resolve(courses);
    }).fail((jq, s, e) => reject(e || s));
  });
}

function loadCoursesList() {
  const jq = (window as any).jQuery || (window as any).$;
  const container = jq('#cwu-courses-list');
  container.text('Loading courses…');
  fetchStudentCourses().then((courses) => {
    if (!courses.length) {
      container.html('<div class="alert alert-warning">No active courses found.</div>');
      return;
    }
    COURSE_INDEX = Object.fromEntries(courses.map(c => [c.id, c]));
    const html = [
      '<div class="form-group">',
      '<label><input type="checkbox" id="cwu-select-all" checked> Select all</label>',
      '<div style="max-height: 200px; overflow:auto; border:1px solid #ddd; padding:6px; margin-top:6px">',
      ...courses.map(c => `<div><label><input type="checkbox" class="cwu-course" data-id="${c.id}" checked> [${c.course_code || c.id}] ${c.name}</label></div>`),
      '</div></div>'
    ].join('');
    container.html(html);
    jq('#cwu-select-all').on('change', function(this: HTMLInputElement){
      jq('.cwu-course').prop('checked', this.checked);
    });
    jq('#cwu-create-events').prop('disabled', true).text('Create events (coming soon)');
  }).catch(() => {
    container.html('<div class="alert alert-danger">Failed to load courses.</div>');
  });
}

function toISO(dateYMD: string, timeHM: string): string {
  const [y,m,d] = dateYMD.split('-').map(Number);
  const [hh,mm] = timeHM.split(':').map(Number);
  const dt = new Date(y, m-1, d, hh, mm, 0);
  return dt.toISOString();
}

function endISOFromStart(startYMD: string, timeHM: string, durationMin: number): string {
  const [y,m,d] = startYMD.split('-').map(Number);
  const [hh,mm] = timeHM.split(':').map(Number);
  const dt = new Date(y, m-1, d, hh, mm, 0);
  dt.setMinutes(dt.getMinutes() + durationMin);
  return dt.toISOString();
}

function untilZ(endYMD: string): string {
  // 23:59:59Z on end date
  const [y,m,d] = endYMD.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d, 23, 59, 59));
  const pad = (n: number) => n.toString().padStart(2,'0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T235959Z`;
}

function selectedByDays(): string[] {
  const jq = (window as any).jQuery || (window as any).$;
  const map: Record<string,string> = { 'cwu-mon':'MO','cwu-tue':'TU','cwu-wed':'WE','cwu-thu':'TH','cwu-fri':'FR','cwu-sat':'SA','cwu-sun':'SU' };
  return Object.keys(map).filter(id => jq(`#${id}`).prop('checked')).map(id => map[id]);
}

async function createEventsForSelection() {
  const jq = (window as any).jQuery || (window as any).$;
  const startDate = (jq('#cwu-start-date').val() as string) || '';
  const endDate = (jq('#cwu-end-date').val() as string) || '';
  const startTime = (jq('#cwu-start-time').val() as string) || '09:00';
  const duration = parseInt(jq('#cwu-duration').val() as any, 10) || 55;
  const location = (jq('#cwu-location').val() as string) || '';
  const days = selectedByDays();
  if (!startDate || !endDate || !days.length) {
    jq('#cwu-import-alert').removeClass('alert-info').addClass('alert-warning').text('Please select at least one day and set start/end dates.').show();
    return;
  }
  const rrule = `FREQ=WEEKLY;BYDAY=${days.join(',')};UNTIL=${untilZ(endDate)}`;
  const start_at = toISO(startDate, startTime);
  const end_at = endISOFromStart(startDate, startTime, duration);

  const ids = $('.cwu-course:checked').map((i,el)=>Number($(el).data('id'))).get();
  if (!ids.length) {
    jq('#cwu-import-alert').removeClass('alert-info').addClass('alert-warning').text('Please select at least one course.').show();
    return;
  }

  jq('#cwu-import-alert').removeClass('alert-warning').addClass('alert-info').text('Creating events…').show();

  const url = getBaseApiUrl() + 'calendar_events';
  const ctxCode = (() => {
    try { return `user_${(window as any).ENV.current_user.id}`; } catch { return 'user_self'; }
  })();
  const getCsrf = () => {
    const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    return meta?.content || '';
  };

  const tz = (() => (Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'))();

  const createSeries = (courseId: number) => new Promise<{ok: boolean, status?: number, message?: string}>((resolve) => {
    const meta = COURSE_INDEX[courseId];
    const prefix = meta?.course_code ? `[${meta.course_code}]` : `[${courseId}]`;
    const payloadWithCtx: any = {
      'calendar_event[context_code]': ctxCode,
      'calendar_event[title]': `${prefix} Class`,
      'calendar_event[start_at]': start_at,
      'calendar_event[end_at]': end_at,
      'calendar_event[rrule]': rrule,
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadNoCtx: any = {
      'calendar_event[title]': `${prefix} Class`,
      'calendar_event[start_at]': start_at,
      'calendar_event[end_at]': end_at,
      'calendar_event[rrule]': rrule,
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadAltCtx: any = {
      'calendar_event[context_type]': 'User',
      'calendar_event[context_id]': (window as any).ENV?.current_user?.id,
      'calendar_event[title]': `${prefix} Class`,
      'calendar_event[start_at]': start_at,
      'calendar_event[end_at]': end_at,
      'calendar_event[rrule]': rrule,
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    $.ajax({
      url,
      method: 'POST',
      headers: { 'X-CSRF-Token': getCsrf() },
      data: payloadWithCtx
    }).done(() => resolve({ok:true}))
      .fail((jqXHR) => {
        if (jqXHR.status === 422) {
          // Retry without context_code; Canvas will default to personal calendar
          $.ajax({ url, method: 'POST', headers: { 'X-CSRF-Token': getCsrf() }, data: payloadNoCtx })
            .done(() => resolve({ok:true}))
            .fail((jq2) => {
              if (jq2.status === 422) {
                // Final retry with context_type/context_id
                $.ajax({ url, method: 'POST', headers: { 'X-CSRF-Token': getCsrf() }, data: payloadAltCtx })
                  .done(() => resolve({ok:true}))
                  .fail((jq3) => {
                    console.warn('Calendar event create failed (alt ctx)', jq3.status, jq3.responseText);
                    resolve({ok:false, status: jq3.status, message: jq3.responseText});
                  });
              } else {
                console.warn('Calendar event create failed (no ctx)', jq2.status, jq2.responseText);
                resolve({ok:false, status: jq2.status, message: jq2.responseText});
              }
            });
        } else {
          console.warn('Calendar event create failed', jqXHR.status, jqXHR.responseText);
          resolve({ok:false, status: jqXHR.status, message: jqXHR.responseText});
        }
      });
  });

  const createSingle = (courseId: number, ymd: string) => new Promise<{ok: boolean}>((resolve) => {
    const meta = COURSE_INDEX[courseId];
    const prefix = meta?.course_code ? `[${meta.course_code}]` : `[${courseId}]`;
    const payloadWithCtx: any = {
      'calendar_event[context_code]': ctxCode,
      'calendar_event[title]': `${prefix} Class`,
      'calendar_event[start_at]': toISO(ymd, startTime),
      'calendar_event[end_at]': endISOFromStart(ymd, startTime, duration),
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadNoCtx: any = {
      'calendar_event[title]': `${prefix} Class`,
      'calendar_event[start_at]': toISO(ymd, startTime),
      'calendar_event[end_at]': endISOFromStart(ymd, startTime, duration),
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    const payloadAltCtx: any = {
      'calendar_event[context_type]': 'User',
      'calendar_event[context_id]': (window as any).ENV?.current_user?.id,
      'calendar_event[title]': `${prefix} Class`,
      'calendar_event[start_at]': toISO(ymd, startTime),
      'calendar_event[end_at]': endISOFromStart(ymd, startTime, duration),
      'calendar_event[location_name]': location,
      'calendar_event[all_day]': false,
      'calendar_event[time_zone]': tz
    };
    $.ajax({
      url,
      method: 'POST',
      headers: { 'X-CSRF-Token': getCsrf() },
      data: payloadWithCtx
    }).done(() => resolve({ok:true}))
      .fail((jqXHR) => {
        if (jqXHR.status === 422) {
          $.ajax({ url, method: 'POST', headers: { 'X-CSRF-Token': getCsrf() }, data: payloadNoCtx })
            .done(() => resolve({ok:true}))
            .fail((jq2) => {
              if (jq2.status === 422) {
                $.ajax({ url, method: 'POST', headers: { 'X-CSRF-Token': getCsrf() }, data: payloadAltCtx })
                  .done(() => resolve({ok:true}))
                  .fail(() => resolve({ok:false}));
              } else {
                resolve({ok:false});
              }
            });
        } else {
          resolve({ok:false});
        }
      });
  });

  // Pace requests to avoid bursts
  // First attempt: recurring series via RRULE
  let seriesFailed = 0;
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    const res = await createSeries(id);
    if (!res.ok) seriesFailed++;
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 120));
  }

  if (seriesFailed === 0) {
    jq('#cwu-import-alert').removeClass('alert-warning').addClass('alert-success').text('Recurring events created. You may need to refresh to see all series.').show();
  } else {
    // Fallback: create individual occurrences for each selected day between start and end
    jq('#cwu-import-alert').removeClass('alert-info').addClass('alert-warning').text('Could not create recurring series (422). Falling back to individual events…').show();

    const dayMap: Record<string, number> = { MO:1, TU:2, WE:3, TH:4, FR:5, SA:6, SU:0 };
    const wanted = new Set(days.map(d => dayMap[d]));
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (wanted.has(d.getDay())) {
        dates.push(d.toISOString().slice(0,10));
      }
    }

    let failedSingles = 0;
    for (const id of ids) {
      for (const ymd of dates) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await createSingle(id, ymd);
        if (!ok.ok) failedSingles++;
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 80));
      }
    }
    if (failedSingles === 0) {
      jq('#cwu-import-alert').removeClass('alert-warning').addClass('alert-success').text('Events created as individual occurrences.').show();
    } else {
      jq('#cwu-import-alert').removeClass('alert-info').addClass('alert-warning').html(`Some events failed to create (${failedSingles}). Check console for details.`).show();
    }
  }

  // Trigger a refetch so new events show without hard reload
  try { (window as any).jQuery('.calendar.fc').fullCalendar('refetchEvents'); } catch {}
}
