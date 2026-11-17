# MediCare+

MediCare+ is a browser-only health-record and doctor-discovery demo. It keeps
records, demo appointment requests, and preferences in the current browser;
nothing is shared with a clinic or another visitor. The included patient
history, doctors, and nearby distances are fictional examples.

## Run locally

From this folder, run:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>.

Demo sign-ins (both use `pass123`):

- Patient: `patient@example.com` — ID `PH_LOCAL_0001`, SK ANISUR RAHAMAN
- Doctor: `doctor@example.com` — ID `DR_LOCAL_0001`, SK ANISH, MBBS, MS,
  General Surgery

Patients can search the demo directory by doctor ID, browse sample nearby
doctors, and save appointment requests locally. Requests are not sent to
doctors. Distances are illustrative and are not based on device location.

The Health Assistant matches a small set of common symptoms to general
self-care ideas and signs for when to seek medical help. It uses local rules,
is not connected to an AI model, cannot diagnose or provide a personal
treatment plan, and does not prescribe medicines. It is not a substitute for
professional medical care. Optional speech input depends on browser support
and may use the browser's own speech service.

This site has no verified accounts or secure medical-record service. Do not
store sensitive health information or use it for clinical decisions. Selecting
a report file records its name only; file contents are not uploaded or saved.

## Render static site

Connect this repository to Render as a Blueprint and apply `render.yaml`.
Render publishes the website files from `public/`.
