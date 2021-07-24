// ==UserScript==
// @name        Twitter Click'n'Save
// @version     0.1.9
// @namespace   gh.alttiri
// @description Add buttons to download images and videos in Twitter, also does some other enhancements.
// @match       https://twitter.com/*
// @homepageURL https://github.com/AlttiRi/twitter-click-and-save
// @supportURL  https://github.com/AlttiRi/twitter-click-and-save/issues
// @downloadURL https://github.com/AlttiRi/twitter-click-and-save/raw/master/twitter-click-and-save.user.js
// ==/UserScript==

// --- For debug --- //
const verbose = false;

// --- Constants for language dependent features --- //
const SUPPORTED_LANGUAGES = ["en",                     "ru",                     "es",                                 ];
const VIEW                = ["View",                   "Посмотреть",             "Ver",                                ];
const YES_VIEW_PROFILE    = ["Yes, view profile",      "Да, посмотреть профиль", "Sí, ver perfil",                     ];
const SIGNUP              = ["Sign up",                "Зарегистрироваться",     "Regístrate",                         ];
const TRENDS              = ["Timeline: Trending now", "Лента: Актуальные темы", "Cronología: Tendencias del momento", ];
const TOPICS_TO_FOLLOW    = ["Timeline: ",             null,                     "Cronología: ",                       ];
const WHO_TO_FOLLOW       = ["Who to follow",          "Кого читать",            "A quién seguir",                     ];
const FOOTER              = ["Footer",                 "Нижний колонтитул",      "Pie de página",                      ];
const defaultQuotes       = [`"`, `"`];
const QUOTES              = [defaultQuotes,            [`«`,`»`],                defaultQuotes,                        ];
const ON_TWITTER          = ["on Twitter",             "в Твиттере",             "en Twitter",                         ];
const TWITTER             = ["Twitter",                "Твиттер",                "Twitter",                            ];
const lang = document.querySelector("html").getAttribute("lang");
const langIndex = SUPPORTED_LANGUAGES.indexOf(lang);

// --- "Imports" --- //
const LS = hoistLS({verbose});
const API = hoistAPI();
const Post = hoistPost();
const Features = hoistFeatures();


// --- Script runner --- //
(function starter() {
    mainOnce();

    const targetNode = document.querySelector("body");
    const observerOptions = {
        subtree: true,
        childList: true,
    };
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, observerOptions);

    const throttledMain = throttle(main, 200);
    function callback(mutationList, observer) {
        verbose && console.log(mutationList);
        instantMain();
        throttledMain();
    }
})();


// --- Features to execute --- //
function mainOnce() {
    addCSS(getUserScriptCSS());
    Features.hideSignUpBottomBar();
    Features.hideTrends();
    Features.highlightVisitedLinks();
    Features.hideTopicsToFollowInstantly();
}
function instantMain() {
    Features.expandSpoilers();
}
function main() {
    verbose && console.log("main");
    Features.imagesHandler();
    Features.videoHandler();
    Features.expandSpoilers();
    Features.hideSignUpSection();
    Features.hideTopicsToFollow();
    Features.directLinks();
    Features.handleTitle();
}



// --- Features --- //
function hoistFeatures() {
    class Features {
        static async imagesHandler() {
            const images = document.querySelectorAll("img");
            for (const img of images) {

                if (img.width < 200 || img.dataset.handled) {
                    continue;
                }
                verbose && console.log(img, img.width);

                img.dataset.handled = "true";

                const btn = document.createElement("div");
                btn.classList.add("ujs-btn-download");
                btn.dataset.url = img.src;

                btn.addEventListener("click", Features._imageClickHandler);

                let anchor = getNearestElementByType(img, "a");
                // if an image is _opened_ "https://twitter.com/UserName/status/1234567890123456789/photo/1" [fake-url]
                if (!anchor) {
                    anchor = img.parentNode;
                }
                anchor.append(btn);


                await sleep(5); // await append to html
                const id = Post.of(btn)?.id; // no for header image !!!
                const downloaded = LS.hasItem("ujs-twitter-downloaded", id);
                if (downloaded) {
                    btn.classList.add("ujs-already-downloaded");
                }
            }
        }

        static async _imageClickHandler(event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const btn = event.currentTarget;
            const url = handleImgUrl(btn.dataset.url);
            verbose && console.log(url);

            function handleImgUrl(url) {
                const urlObj = new URL(url);
                urlObj.searchParams.set("name", "orig");
                return urlObj.toString();
            }

            const {id, author} = Post.of(btn);
            verbose && console.log(id, author);


            btn.classList.add("ujs-downloading");
            const {blob, lastModifiedDate, extension, name} = await fetchResource(url);

            const filename = `[twitter] ${author}—${lastModifiedDate}—${id}—${name}.${extension}`;
            download(blob, filename, url);

            const downloaded = btn.classList.contains("already-downloaded");
            if (!downloaded) {
                await LS.pushItem("ujs-twitter-downloaded", id);
            }
            btn.classList.remove("ujs-downloading");
            btn.classList.add("ujs-downloaded");
        }



        static async videoHandler() {
            const videos = document.querySelectorAll("video");

            for (const vid of videos) {
                if (vid.dataset.handled) {
                    continue;
                }
                verbose && console.log(vid);
                vid.dataset.handled = "true";

                const btn = document.createElement("div");
                btn.classList.add("ujs-btn-download");
                btn.classList.add("ujs-video");
                btn.addEventListener("click", Features._videoClickHandler);

                let elem = vid.parentNode.parentNode.parentNode;
                elem.after(btn);

                // await sleep(5); // not needed
                const id = Post.of(btn).id;
                const downloaded = LS.hasItem("ujs-twitter-downloaded-videos", id);
                if (downloaded) {
                    btn.classList.add("ujs-already-downloaded");
                }
            }
        }
        static async _videoClickHandler(event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const btn = event.currentTarget;
            const {id, author} = Post.of(btn);
            const video = await API.getVideoInfo(id); // {bitrate, content_type, url}
            verbose && console.log(video);

            btn.classList.add("ujs-downloading");
            const url = video.url;
            const {blob, lastModifiedDate, extension, name} = await fetchResource(url);

            const filename = `[twitter] ${author}—${lastModifiedDate}—${id}—${name}.${extension}`;
            download(blob, filename, url);

            const downloaded = btn.classList.contains("ujs-already-downloaded");
            if (!downloaded) {
                await LS.pushItem("ujs-twitter-downloaded-videos", id);
            }
            btn.classList.remove("ujs-downloading");
            btn.classList.add("ujs-downloaded");
        }


        // it depends of `directLinks()` // use only it after `directLinks()`
        // it looks it simetimes does not work correctly, probably it executes before `directLinks`.
        // todo: keep short urls and rerun this (Note: with the original title) after `directLinks` handled them.
        static handleTitle() {
            // if not a opened post
            if (!location.href.match(/twitter\.com\/[^\/]+\/status\/\d+/)) {
                return;
            }

            let titleText = document.title;
            if (titleText === Features.lastHandledTitle) {
                return;
            }
            
            
            const [openQuote, closeQuote] = QUOTES[langIndex];
            const onTwitter = ON_TWITTER[langIndex];
            const twitter = TWITTER[langIndex];
            
            
            const urlsToReplace = [...titleText.matchAll(new RegExp(`https:\\/\\/t\\.co\\/[^ ${closeQuote}]+`, "g"))].map(el => el[0]);
            // the last one can be the URL to the post // or to an embedded shared URL

            const map = new Map();
            const anchors = document.querySelectorAll(`a[data-redirect^="https://t.co/"]`);
            for (const anchor of anchors) {
                if (urlsToReplace.includes(anchor.dataset.redirect)) {
                    map.set(anchor.dataset.redirect, anchor.href);
                }
            }

            const lastUrl = urlsToReplace.slice(-1)[0];
            let lastUrlIsAttachment = false;
            let attachmentDescription = "";
            if (!map.has(lastUrl)) {
                const a = document.querySelector(`a[href="${lastUrl}?amp=1"]`);
                if (a) {
                    lastUrlIsAttachment = true;
                    attachmentDescription = document.querySelectorAll(`a[href="${lastUrl}?amp=1"]`)[1].innerText;
                    attachmentDescription = attachmentDescription.replaceAll("\n", " — ");
                }
            }


            for (const [key, value] of map.entries()) {
                titleText = titleText.replaceAll(key, value + ` (${key})`);
            }

            titleText = titleText.replace(new RegExp(` ${onTwitter}(?=: ${openQuote})`), "");
            titleText = titleText.replace(new RegExp(`(?<=${closeQuote}) \\\/ ${twitter}$`), "");
            if (!lastUrlIsAttachment) {
                const regExp = new RegExp(`(?<short> https:\\/\\/t\\.co\\/.{6,14})${closeQuote}$`);
                titleText = titleText.replace(regExp, (match, p1, p2, offset, string) => `${closeQuote} —${p1}`);
            } else {
                titleText = titleText.replace(lastUrl, `${lastUrl} (${attachmentDescription})`);
            }
            document.title = titleText; // Note: some characters will be removed automatically (`\n`, extra spaces)
            Features.lastHandledTitle = document.title;
        }
        static lastHandledTitle = "";


        static directLinks() {
            const anchors = xpathAll(`.//a[@dir="ltr" and child::span and not(@data-handled)]`);
            for (const anchor of anchors) {
                const redirectUrl = new URL(anchor.href);
                anchor.dataset.redirect = redirectUrl.origin + redirectUrl.pathname; // remove "?amp=1"
                anchor.dataset.handled = "true";

                const nodes = xpathAll(`./span[text() != "…"]|./text()`, anchor);
                const url = nodes.map(node => node.textContent).join("");
                anchor.href = url;
                anchor.rel = "nofollow noopener noreferrer";
            }
        }

        // Do NOT throttle it
        static expandSpoilers() {
            const main = document.querySelector("main[role=main]");

            const a = main.querySelectorAll("[data-testid=primaryColumn] [role=button]")
            a && [...a]
                .find(el => YES_VIEW_PROFILE.includes(el.textContent))
                ?.click();

            const b = main.querySelectorAll("article article[role=article] [role=button]");
            b && [...b]
                .filter(el => VIEW.includes(el.textContent))
                .forEach(el => el.click());
        }

        static hideSignUpSection() { // "New to Twitter?"
            const labelText = SIGNUP[langIndex];
            if (!labelText) { return; }
            const elem = document.querySelector(`section[aria-label="${labelText}"][role=region]`);
            if (elem) {
                elem.parentNode.classList.add("ujs-hidden");
            }
        }

        // Call it once.
        // "Don’t miss what’s happening" if you are not logged in.
        // It looks that `#layers` is used only for this bar.
        static hideSignUpBottomBar() {
            addCSS(`
                #layers > div:nth-child(1) {
                    display: none;
                }
            `);
        }

        // "Trends for you"
        static hideTrends() {
            const labelText = TRENDS[langIndex];
            if (!labelText) { return; }
            addCSS(`
                [aria-label="${labelText}"]
                {
                    display: none;
                }
            `);
        }
        static highlightVisitedLinks() {
            addCSS(`
                a:visited {
                    color: darkorange;
                }
            `);
        }


        // Use it once. To prevent blinking.
        static hideTopicsToFollowInstantly() {
            const labelText = TOPICS_TO_FOLLOW[langIndex];
            if (!labelText) { return; }
            addCSS(`
                div[aria-label="${labelText}"] {
                    display: none;
                }
            `);
        }
        // Hides container and "separator line"
        static hideTopicsToFollow() {
            const labelText = TOPICS_TO_FOLLOW[langIndex];
            if (!labelText) { return; }
            const elem = xpath(`.//section[@role="region" and child::div[@aria-label="${labelText}"]]/../..`);
            if (!elem) {
                return;
            }
            elem.classList.add("ujs-hidden");
            
            elem.previousSibling.classList.add("ujs-hidden"); // a "separator line" (empty element of "TRENDS", for example)
            // in fact it's a hack // todo rework
        }

        // todo split to two methods
        // todo fix it, currently it works questionably
        static footerHandled = false;
        static hideAndMoveFooter() { // "Terms of Service   Privacy Policy   Cookie Policy"
            let footer = document.querySelector("main[role=main] nav[aria-label=Footer][role=navigation]");
            const nav  = document.querySelector("nav[aria-label=Primary][role=navigation]");

            if (footer) {
                footer = footer.parentNode;
                const separatorLine = footer.previousSibling;

                if (Features.footerHandled) {
                    footer.remove();
                    separatorLine.remove();
                    return;
                }

                nav.append(separatorLine);
                nav.append(footer);
                footer.classList.add("ujs-show-on-hover");
                separatorLine.classList.add("ujs-show-on-hover");

                Features.footerHandled = true;
            }
        }
    }
    return Features;
}

// required CSS
function getUserScriptCSS() {
    const css = `
        .ujs-hidden {
            display: none;
        }
        
        .ujs-show-on-hover:hover {
            opacity: 1;
            transition: opacity 1s ease-out 0.1s;
        }
        .ujs-show-on-hover {
            opacity: 0;
            transition: opacity 0.5s ease-out;
        }
        
        .ujs-btn-download {
            top: 0.5em;
            left: 0.5em;
            width: 33px;
            height: 33px;
            background: #e0245e; /*red*/
            opacity: 0;
            position: absolute;
            border-radius: 0.3em;
        }
        article[role=article]:hover .ujs-btn-download {
            opacity: 1;
        }
        div[aria-label="Image"]:hover .ujs-btn-download {
            opacity: 1;
        }
        
        .ujs-btn-download.ujs-downloaded {
            background: #4caf50; /*green*/
            opacity: 1;
        }
        .ujs-btn-download.ujs-video {
            left: calc(0.5em + 33px + 3px);
        }
        article[role=article]:hover .ujs-already-downloaded:not(.ujs-downloaded) {
            background: #1da1f2; /*blue*/
        }
        div[aria-label="Image"]:hover .ujs-already-downloaded:not(.ujs-downloaded) {
            background: #1da1f2; /*blue*/
        }
        
        /* -------------------------------------------------------- */
        /* Shadow the button on hover, active and while downloading */
        .ujs-btn-download:hover {
            background-image: linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0.05));
        }
        .ujs-btn-download:active {
            background-image: linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.25));
        }
        .ujs-btn-download.ujs-downloading {
            background-image: linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.15));
        }
        
        article[role=article]:hover  .ujs-already-downloaded:not(.ujs-downloaded):hover {
            background-image: linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0.05));
        }
        article[role=article]:hover  .ujs-already-downloaded:not(.ujs-downloaded):active {
            background-image: linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.25));
        }
        article[role=article]:hover  .ujs-already-downloaded:not(.ujs-downloaded).ujs-downloading {
            background-image: linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.15));
        }
        
        div[aria-label="Image"]:hover .ujs-already-downloaded:not(.ujs-downloaded:hover {
            background-image: linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0.05));
        }
        div[aria-label="Image"]:hover .ujs-already-downloaded:not(.ujs-downloaded:active {
            background-image: linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.25));
        }
        div[aria-label="Image"]:hover .ujs-already-downloaded:not(.ujs-downloaded.ujs-downloading {
            background-image: linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.15));
        }
        
        /* -------------------------------------------------------- */
        
        `;
    return css.replaceAll(" ".repeat(8), "");
}


// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

function hoistPost() {
    class Post {
        constructor(elem) {
            this.elem = elem;
            this.url = Post.getUrl(elem);
        }
        static of(innerElem) {
            const elem = getParentWithSiblingDataset(innerElem, "testid", "tweet");
            if (!elem) { // opened image
                verbose && console.log("no-post elem");
            }
            return new Post(elem);
        }
        static getUrl(elem) {
            if (!elem) { // if opened image
                return location.href;
            }

            const postAnchor = [...elem.querySelectorAll("a")].find(el => {
                return el.childNodes[0]?.nodeName === "TIME";
            });

            if (postAnchor) {
                return postAnchor.href;
            }
            // else if selected post
            return location.href;
        }

        get author() {
            return this.url.match(/(?<=twitter\.com\/).+?(?=\/)/)?.[0];
        }
        get id() {
            return this.url.match(/(?<=\/status\/)[^\/]+/)?.[0];
        }
    }
    return Post;
}

function hoistAPI() {
    class API {
        static guestToken = getCookie("gt");
        static csrfToken  = getCookie("ct0");  // todo: lazy — not available at the first run
        // Guest/Suspended account Bearer token
        static guestAuthorization = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

        static async _requestBearerToken() {
            const scriptSrc = [...document.querySelectorAll("script")]
                .find(el => el.src.match(/https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main[\w\d\.]*\.js/)).src;
            const text = await (await fetch(scriptSrc)).text();
            const authorizationKey = text.match(/(?<=")AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D.+?(?=")/)[0];
            const authorization = `Bearer ${authorizationKey}`;

            return authorization;
        }

        static async getAuthorization() {
            if (!API.authorization) {
                API.authorization = await API._requestBearerToken();
            }
            return API.authorization;
        }

        // @return {bitrate, content_type, url}
        static async getVideoInfo(postId) {
            // Hm... it always is the same. Even for a logged user.
            // const authorization = API.guestToken ? API.guestAuthorization : await API.getAuthorization();
            const authorization = API.guestAuthorization;

            // for debug
            verbose && sessionStorage.setItem("guestAuthorization", API.guestAuthorization);
            verbose && sessionStorage.setItem("authorization", API.authorization);
            verbose && sessionStorage.setItem("x-csrf-token", API.csrfToken);
            verbose && sessionStorage.setItem("x-guest-token", API.guestToken);

            // const url = new URL(`https://api.twitter.com/2/timeline/conversation/${postId}.json`); // only for suspended/anon
            const url = new URL(`https://twitter.com/i/api/2/timeline/conversation/${postId}.json`);
            url.searchParams.set("tweet_mode", "extended");

            const headers = new Headers({
                authorization,
                "x-csrf-token": API.csrfToken,
            });
            if (API.guestToken) {
                headers.append("x-guest-token", API.guestToken);
            } else { // may be skipped
                headers.append("x-twitter-active-user", "yes");
                headers.append("x-twitter-auth-type", "OAuth2Session");
            }

            const response = await fetch(url, {headers});
            const json = await response.json();

            verbose && console.warn(JSON.stringify(json, null, " "));
            // 429 - [{code: 88, message: "Rate limit exceeded"}] — for suspended accounts


            const postData = json.globalObjects.tweets[postId];
            const videoVariants = postData.extended_entities.media[0].video_info.variants;
            verbose && console.log(videoVariants);


            const video = videoVariants
                .filter(el => el.bitrate !== undefined) // if content_type: "application/x-mpegURL" // .m3u8
                .reduce((acc, cur) => cur.bitrate > acc.bitrate ? cur : acc);
            return video;
        }
    }
    return API;
}


// --- Util --- //

// --- LocalStorage util class --- //
function hoistLS(settings = {}) {
    const {
        verbose, // bebug "messages" in the document.title
    } = settings;
    class LS {
        constructor(name) {
            this.name = name;
        }
        getItem(defaultValue) {
            return LS.getItem(this.name, defaultValue);
        }
        setItem(value) {
            LS.setItem(this.name, value);
        }
        removeItem() {
            LS.removeItem(this.name);
        }
        async pushItem(value) {  // array method
            await LS.pushItem(this.name, value);
        }
        async popItem(value) {   // array method
            await LS.popItem(this.name, value);
        }
        hasItem(value) {         // array method
            return LS.hasItem(this.name, value);
        }

        static getItem(name, defaultValue) {
            const value = localStorage.getItem(name);
            if (value === undefined) {
                return undefined;
            }
            if (value === null) { // when there is no such item
                LS.setItem(name, defaultValue);
                return defaultValue;
            }
            return JSON.parse(value);
        }
        static setItem(name, value) {
            localStorage.setItem(name, JSON.stringify(value));
        }
        static removeItem(name) {
            localStorage.removeItem(name);
        }
        static async pushItem(name, value) {
            const array = LS.getItem(name, []);
            array.push(value);
            LS.setItem(name, array);

            //sanity check
            await sleep(50);
            if (!LS.hasItem(name, value)) {
                if (verbose) {
                    document.title = "🟥" + document.title;
                }
                await LS.pushItem(name, value);
            }
        }
        static async popItem(name, value) { // remove from an array
            const array = LS.getItem(name, []);
            if (array.indexOf(value) !== -1) {
                array.splice(array.indexOf(value), 1);
                LS.setItem(name, array);

                //sanity check
                await sleep(50);
                if (LS.hasItem(name, value)) {
                    if (verbose) {
                        document.title = "🟨" + document.title;
                    }
                    await LS.popItem(name, value);
                }
            }
        }
        static hasItem(name, value) { // has in array
            const array = LS.getItem(name, []);
            return array.indexOf(value) !== -1;
        }
    }
    return LS;
}


function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function fetchResource(url) {
    url = new URL(url);
    const response = await fetch(url, {
        cache: "force-cache",
    });
    const lastModifiedDateSeconds = response.headers.get("last-modified");
    const contentType = response.headers.get("content-type");

    const lastModifiedDate = dateToDayDateString(lastModifiedDateSeconds);
    const extension = extensionFromMime(contentType);
    const blob = await response.blob();

    // https://pbs.twimg.com/media/AbcdEFgijKL01_9?format=jpg&name=orig                                     -> AbcdEFgijKL01_9
    // https://pbs.twimg.com/ext_tw_video_thumb/1234567890123456789/pu/img/Ab1cd2345EFgijKL.jpg?name=orig   -> Ab1cd2345EFgijKL.jpg
    // https://video.twimg.com/ext_tw_video/1234567890123456789/pu/vid/946x720/Ab1cd2345EFgijKL.mp4?tag=10  -> Ab1cd2345EFgijKL.mp4
    const {filename} = (url.origin + url.pathname).match(/(?<filename>[^\/]+$)/).groups;

    const {name} = filename.match(/(?<name>^[^\.]+)/).groups;
    return {blob, lastModifiedDate, contentType, extension, name};
}

function extensionFromMime(mimeType) {
    let extension = mimeType.match(/(?<=\/).+/)[0];
    extension = extension === "jpeg" ? "jpg" : extension;
    return extension;
}

function download(blob, name = "", url = "") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob) + "#" + url;
    a.download = name;
    a.click();

    setTimeout(_ => {
        URL.revokeObjectURL(a.href);
    }, 1000 * 60);
}

// "Sun, 10 Jan 2021 22:22:22 GMT" -> "2021.01.10"
function dateToDayDateString(dateValue, utc = true) {
    const _date = new Date(dateValue);
    function pad(str) {
        return str.toString().padStart(2, "0");
    }
    const _utc = utc ? "UTC" : "";
    const year  = _date[`get${_utc}FullYear`]();
    const month = _date[`get${_utc}Month`]() + 1;
    const date  = _date[`get${_utc}Date`]();

    return year + "." + pad(month) + "." + pad(date);
}



function addCSS(css) {
   const styleElem = document.createElement("style");
    styleElem.textContent = css;
    document.body.append(styleElem);
    return styleElem;
}


function getCookie(name) {
    verbose && console.log(document.cookie);
    const regExp = new RegExp(`(?<=${name}=)[^;]+`);
    return document.cookie.match(regExp)?.[0];
}

function throttle(runnable, time = 50) {
    let waiting = false;
    let queued = false;
    let context;
    let args;

    return function() {
        if (!waiting) {
            waiting = true;
            setTimeout(function() {
                if (queued) {
                    runnable.apply(context, args);
                    context = args = undefined;
                }
                waiting = queued = false;
            }, time);
            return runnable.apply(this, arguments);
        } else {
            queued = true;
            context = this;
            args = arguments;
        }
    }
}
function throttleWithResult(func, time = 50) {
    let waiting = false;
    let args;
    let context;
    let timeout;
    let promise;

    return async function() {
        if (!waiting) {
            waiting = true;
            timeout = new Promise(async resolve => {
                await sleep(time);
                waiting = false;
                resolve();
            });
            return func.apply(this, arguments);
        } else {
            args = arguments;
            context = this;
        }

        if (!promise) {
            promise = new Promise(async resolve => {
                await timeout;
                const result = func.apply(context, args);
                args = context = promise = undefined;
                resolve(result);
            });
        }
        return promise;
    }
}


function xpath(path, node = document) {
    let xPathResult = document.evaluate(path, node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return xPathResult.singleNodeValue;
}
function xpathAll(path, node = document) {
    let xPathResult = document.evaluate(path, node, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const nodes = [];
    try {
        let node = xPathResult.iterateNext();

        while (node) {
            nodes.push(node);
            node = xPathResult.iterateNext();
        }
        return nodes;
    }
    catch (e) {
        // todo need investigate it
        console.error(e); // "The document has mutated since the result was returned."
        return [];
    }
}


function getNearestElementByType(elem, type) {
    const parent = elem.parentNode;
    if (parent === document) {
        return null;
    }
    if (parent.nodeName === type.toUpperCase()) {
        return parent;
    }
    return getNearestElementByType(parent, type);
}
function getParentWithSiblingDataset(node, name, value) {
    const parent = node.parentNode;
    if (parent === document) {
        return null;
    }
    // console.log(parent, parent.childNodes);
    const elem = [...parent.childNodes].find(el => {
        if (el.dataset?.[name] === value) {
            return true;
        }
    });
    if (!elem) {
        return getParentWithSiblingDataset(parent, name, value);
    }
    return parent;
}
