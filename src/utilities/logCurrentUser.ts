import { getBaseApiUrl } from "../canvas/settings";

export function logCurrentUser(): void {
    const url = getBaseApiUrl() + "users/self";
    $.getJSON(url, (data) => {
        console.log("[more-canvas-tools] Current user from Canvas API:", data);
    }).fail((jqXHR, textStatus, errorThrown) => {
        console.error("[more-canvas-tools] Failed to fetch current user:", textStatus, errorThrown);
    });
}







