For the Indeed content script:

Build a Chrome Manifest V3 content script for employers.indeed.com/jobs/*/applicants. The recruiter is already logged in. The script should:

On page load, find all candidate cards in the applicant list DOM. The list items are rendered as repeated card components — use querySelectorAll with data-testid attributes where possible since those are more stable than class names.
From each card extract: candidate name, most recent job title, location, resume last-active date, and the indeed applicant ID (pull it from the href of the profile link).
Also detect if the current URL contains a job ID and extract it as platform_job_id.
POST the extracted array to http://localhost:3000/api/ingest with { source: 'indeed', platform_job_id, candidates: [...] }.
Because Indeed is a React SPA, also set up a MutationObserver on the list container so the script re-runs when the DOM updates (pagination, filters changing).
Add a 500ms debounce on the observer so it doesn't fire on every single DOM mutation.
Log to console how many candidates were found and POSTed each run.

Do not use any libraries. Vanilla JS only. The script will be loaded via the extension manifest content_scripts array.


For the LinkedIn content script:

Build a Chrome Manifest V3 content script for linkedin.com/talent/hire/*/manage/applicants and linkedin.com/talent/search. LinkedIn's rendered class names are obfuscated and change frequently, so instead of reading the DOM directly, intercept LinkedIn's own internal API responses.
Strategy:

In the content script, inject a small script into the page context (use document.createElement('script') + src = chrome.runtime.getURL('interceptor.js')) to get around the isolated world restriction.
In interceptor.js (listed in web_accessible_resources), proxy XMLHttpRequest.prototype.open and window.fetch to intercept responses whose URL contains /voyager/api/talent or /voyager/api/search.
When a matching response comes in, parse the JSON body. LinkedIn's talent API returns candidate profile data under nested keys — look for elements arrays containing objects with firstName, lastName, headline, locationName, and a profileId or publicIdentifier.
Pass the extracted data from page context to the content script context using window.postMessage, then from the content script to the background service worker using chrome.runtime.sendMessage.
The background worker collects messages and POSTs batches to http://localhost:3000/api/ingest with { source: 'linkedin', candidates: [...] }.
Because LinkedIn's API shape changes, log the raw response JSON to console in dev mode so the shape can be inspected and the selectors updated.

Do not try to scrape rendered HTML — LinkedIn minifies and rotates class names. The XHR/fetch intercept approach targets the data layer, which is more stable.