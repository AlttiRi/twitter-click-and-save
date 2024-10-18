// ==UserScript==
// @name        Twitter Click'n'Save
// @version     1.13.0-2024.10.18
// @namespace   gh.alttiri
// @description Add buttons to download images and videos in Twitter, also does some other enhancements.
// @match       https://twitter.com/*
// @match       https://x.com/*
// @homepageURL https://github.com/AlttiRi/twitter-click-and-save
// @supportURL  https://github.com/AlttiRi/twitter-click-and-save/issues
// @license     GPL-3.0
// @grant       GM_registerMenuCommand
// ==/UserScript==
// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------



// Please, report bugs and suggestions on GitHub, not Greasyfork.
// --> https://github.com/AlttiRi/twitter-click-and-save/issues <--



// ---------------------------------------------------------------------------------------------------------------------
const sitename = location.hostname.replace(".com", ""); // "twitter" | "x"
// ---------------------------------------------------------------------------------------------------------------------
// --- "Imports" --- //
const {StorageNames, StorageNamesOld} = getStorageNames();

const {verbose, debugPopup} = getDebugSettings(); // --- For debug --- //


const {
    sleep, fetchResource, downloadBlob,
    addCSS,
    getCookie,
    throttle,
    xpath, xpathAll,
    responseProgressProxy,
    dateToDayDateString,
    toLineJSON,
    isFirefox,
    getBrowserName,
    removeSearchParams,
} = getUtils({verbose});

const LS = hoistLS({verbose});

const API = hoistAPI();
const Tweet = hoistTweet();
const Features = hoistFeatures();
const I18N = getLanguageConstants();



// ---------------------------------------------------------------------------------------------------------------------

function getStorageNames() {
    // New LocalStorage key names 2023.07.05
    const StorageNames = {
        settings:                "ujs-twitter-click-n-save-settings",
        settingsImageHistoryBy:  "ujs-twitter-click-n-save-settings-image-history-by",
        downloadedImageNames:    "ujs-twitter-click-n-save-downloaded-image-names",
        downloadedImageTweetIds: "ujs-twitter-click-n-save-downloaded-image-tweet-ids",
        downloadedVideoTweetIds: "ujs-twitter-click-n-save-downloaded-video-tweet-ids",

        migrated:                "ujs-twitter-click-n-save-migrated",     // Currently unused
        browserName:             "ujs-twitter-click-n-save-browser-name", // Hidden settings
        verbose:                 "ujs-twitter-click-n-save-verbose",      // Hidden settings for debug
        debugPopup:              "ujs-twitter-click-n-save-debug-popup",  // Hidden settings for debug
    };
    const StorageNamesOld = {
        settings:                "ujs-click-n-save-settings",
        settingsImageHistoryBy:  "ujs-images-history-by",
        downloadedImageNames:    "ujs-twitter-downloaded-images-names",
        downloadedImageTweetIds: "ujs-twitter-downloaded-image-tweet-ids",
        downloadedVideoTweetIds: "ujs-twitter-downloaded-video-tweet-ids",
    };
    return {StorageNames, StorageNamesOld};
}

function getDebugSettings() {
    let verbose    = false;
    let debugPopup = false;
    try {
        verbose    = Boolean(JSON.parse(localStorage.getItem(StorageNames.verbose)));
    } catch (err) {}
    try {
        debugPopup = Boolean(JSON.parse(localStorage.getItem(StorageNames.debugPopup)));
    } catch (err) {}

    return {verbose, debugPopup};
}

const historyHelper = getHistoryHelper();
historyHelper.migrateLocalStore();

// ---------------------------------------------------------------------------------------------------------------------


// ---------------------------------------------------------------------------------------------------------------------

if (globalThis.GM_registerMenuCommand /* undefined in Firefox with VM */ || typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("Show settings", showSettings);
}

const settings = loadSettings();

if (verbose) {
    console.log("[ujs][settings]", settings);
}
if (debugPopup) {
    showSettings();
}

// ---------------------------------------------------------------------------------------------------------------------

const fetch = ujs_getGlobalFetch({verbose, strictTrackingProtectionFix: settings.strictTrackingProtectionFix});

function ujs_getGlobalFetch({verbose, strictTrackingProtectionFix} = {}) {
    const useFirefoxStrictTrackingProtectionFix = strictTrackingProtectionFix === undefined ? true : strictTrackingProtectionFix; // Let's use by default
    const useFirefoxFix = useFirefoxStrictTrackingProtectionFix && typeof wrappedJSObject === "object" && typeof wrappedJSObject.fetch === "function";
    // --- [VM/GM + Firefox ~90+ + Enabled "Strict Tracking Protection"] fix --- //
    function fixedFirefoxFetch(resource, init = {}) {
        verbose && console.log("[ujs][wrappedJSObject.fetch]", resource, init);
        if (init.headers instanceof Headers) {
            // Since `Headers` are not allowed for structured cloning.
            init.headers = Object.fromEntries(init.headers.entries());
        }
        return wrappedJSObject.fetch(cloneInto(resource, document), cloneInto(init, document));
    }
    return useFirefoxFix ? fixedFirefoxFetch : globalThis.fetch;
}

// ---------------------------------------------------------------------------------------------------------------------
// --- Features to execute --- //

const doNotPlayVideosAutomatically = false; // Hidden settings

function execFeaturesOnce() {
    settings.goFromMobileToMainSite         && Features.goFromMobileToMainSite();
    settings.addRequiredCSS                 && Features.addRequiredCSS();
    settings.hideSignUpBottomBarAndMessages && Features.hideSignUpBottomBarAndMessages(doNotPlayVideosAutomatically);
    settings.hideTrends                     && Features.hideTrends();
    settings.highlightVisitedLinks          && Features.highlightVisitedLinks();
    settings.hideLoginPopup                 && Features.hideLoginPopup();
}
function execFeaturesImmediately() {
    settings.expandSpoilers     && Features.expandSpoilers();
}
function execFeatures() {
    settings.imagesHandler      && Features.imagesHandler();
    settings.videoHandler       && Features.videoHandler();
    settings.expandSpoilers     && Features.expandSpoilers();
    settings.hideSignUpSection  && Features.hideSignUpSection();
    settings.directLinks        && Features.directLinks();
    settings.handleTitle        && Features.handleTitle();
}

// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// --- Script runner --- //

(function starter(feats) {
    const {once, onChangeImmediate, onChange} = feats;

    once();
    onChangeImmediate();
    const onChangeThrottled = throttle(onChange, 250);
    onChangeThrottled();

    const targetNode = document.querySelector("body");
    const observerOptions = {
        subtree: true,
        childList: true,
    };
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, observerOptions);

    function callback(mutationList, _observer) {
        verbose && console.log("[ujs][mutationList]", mutationList);
        onChangeImmediate();
        onChangeThrottled();
    }
})({
    once: execFeaturesOnce,
    onChangeImmediate: execFeaturesImmediately,
    onChange: execFeatures
});

// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

function loadSettings() {
    const defaultSettings = {
        hideTrends: true,
        hideSignUpSection: false,
        hideSignUpBottomBarAndMessages: false,
        doNotPlayVideosAutomatically: false,
        goFromMobileToMainSite: false,

        highlightVisitedLinks: true,
        highlightOnlySpecialVisitedLinks: true,
        expandSpoilers: true,

        directLinks: true,
        handleTitle: true,

        imagesHandler: true,
        videoHandler: true,
        addRequiredCSS: true,

        hideLoginPopup: false,
        addBorder: false,

        downloadProgress: true,
        strictTrackingProtectionFix: false,
    };

    let savedSettings;
    try {
        savedSettings = JSON.parse(localStorage.getItem(StorageNames.settings)) || {};
    } catch (err) {
        console.error("[ujs][parse-settings]", err);
        localStorage.removeItem(StorageNames.settings);
        savedSettings = {};
    }
    savedSettings = Object.assign(defaultSettings, savedSettings);
    return savedSettings;
}
function showSettings() {
    closeSetting();
    if (window.scrollY > 0) {
        document.querySelector("html").classList.add("ujs-scroll-initial");
        document.body.classList.add("ujs-scrollbar-width-margin-right");
    }
    document.body.classList.add("ujs-no-scroll");

    const modalWrapperStyle = `
    color-scheme: light;
    width: 100%;
    height: 100%;
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    backdrop-filter: blur(4px);
    background-color: rgba(255, 255, 255, 0.5);
  `;
    const modalSettingsStyle = `
    background-color: white;
    min-width: 320px;
    min-height: 320px;
    border: 1px solid darkgray;
    padding: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  `;
    const s = settings;
    const downloadProgressFFTitle = `Disable the download progress if you use Firefox with "Enhanced Tracking Protection" set to "Strict" and ViolentMonkey, or GreaseMonkey extension`;
    const strictTrackingProtectionFixFFTitle = `Choose this if you use ViolentMonkey, or GreaseMonkey in Firefox with "Enhanced Tracking Protection" set to "Strict". It is not required in case you use TamperMonkey.`;
    document.body.insertAdjacentHTML("afterbegin", `
  <div class="ujs-modal-wrapper" style="${modalWrapperStyle}">
      <div class="ujs-modal-settings" style="${modalSettingsStyle}">
          <fieldset>
              <legend>Optional</legend>
              <label title="Makes the button more visible"><input type="checkbox" ${s.addBorder ? "checked" : ""} name="addBorder">Add a white border to the download button<br/></label>
              <label title="WARNING: It may broke the login page, but it works fine if you logged in and want to hide 'Messages'"><input type="checkbox" ${s.hideSignUpBottomBarAndMessages ? "checked" : ""} name="hideSignUpBottomBarAndMessages">Hide <strike><b>Sign Up Bar</b> and</strike> <b>Messages</b> (in the bottom). <span title="WARNING: It may broke the login page!">(beta)</span><br/></label>
              <label><input type="checkbox" ${s.hideTrends ? "checked" : ""} name="hideTrends">Hide <b>Trends</b> (in the right column)*<br/></label>
              <label hidden><input type="checkbox" ${s.doNotPlayVideosAutomatically ? "checked" : ""} name="doNotPlayVideosAutomatically">Do <i>Not</i> Play Videos Automatically</b><br/></label>
              <label hidden><input type="checkbox" ${s.goFromMobileToMainSite ? "checked" : ""} name="goFromMobileToMainSite">Redirect from Mobile version (beta)<br/></label>
          </fieldset>
          <fieldset>
              <legend>Recommended</legend>
              <label><input type="checkbox" ${s.highlightVisitedLinks ? "checked" : ""} name="highlightVisitedLinks">Highlight Visited Links<br/></label>
              <label title="In most cases absolute links are 3rd-party links"><input type="checkbox" ${s.highlightOnlySpecialVisitedLinks ? "checked" : ""} name="highlightOnlySpecialVisitedLinks">Highlight Only Absolute Visited Links<br/></label>

              <label title="Note: since the recent update the most NSFW spoilers are impossible to expand without an account"><input type="checkbox" ${s.expandSpoilers ? "checked" : ""} name="expandSpoilers">Expand Spoilers (if possible)*<br/></label>
          </fieldset>
          <fieldset>
              <legend>Highly Recommended</legend>
              <label><input type="checkbox" ${s.directLinks ? "checked" : ""} name="directLinks">Direct Links</label><br/>
              <label><input type="checkbox" ${s.handleTitle ? "checked" : ""} name="handleTitle">Enchance Title*<br/></label>
          </fieldset>
          <fieldset ${isFirefox ? '': 'style="display: none"'}>
              <legend>Firefox only</legend>
              <label title='${downloadProgressFFTitle}'><input type="radio" ${s.downloadProgress ? "checked" : ""} name="firefoxDownloadProgress" value="downloadProgress">Download Progress<br/></label>
              <label title='${strictTrackingProtectionFixFFTitle}'><input type="radio" ${s.strictTrackingProtectionFix ? "checked" : ""} name="firefoxDownloadProgress" value="strictTrackingProtectionFix">Strict Tracking Protection Fix<br/></label>
          </fieldset>
          <fieldset>
              <legend>Main</legend>
              <label><input type="checkbox" ${s.imagesHandler ? "checked" : ""} name="imagesHandler">Image Download Button<br/></label>
              <label><input type="checkbox" ${s.videoHandler ? "checked" : ""} name="videoHandler">Video Download Button<br/></label>
              <label hidden><input type="checkbox" ${s.addRequiredCSS ? "checked" : ""} name="addRequiredCSS">Add Required CSS*<br/></label><!-- * Only for the image download button in /photo/1 mode -->
          </fieldset>
          <fieldset>
              <legend title="Outdated due to Twitter's updates, or impossible to reimplement">Outdated</legend>
              <strike>

              <label><input type="checkbox" ${s.hideSignUpSection ? "checked" : ""} name="hideSignUpSection">Hide <b title='"New to Twitter?" (If yoy are not logged in)'>Sign Up</b> section (in the right column)*<br/></label>
              <label title="Hides the modal login pop up. Useful if you have no account. \nWARNING: Currently it will close any popup, not only the login one.\nIt's recommended to use only if you do not have an account to hide the annoiyng login popup."><input type="checkbox" ${s.hideLoginPopup ? "checked" : ""} name="hideLoginPopup">Hide <strike>Login</strike> Popups. (beta)<br/></label>

              </strike>
          </fieldset>
          <hr>
          <div style="display: flex; justify-content: space-around;">
              <div>
                History:
                <button class="ujs-reload-export-button" style="padding: 5px" >Export</button>
                <button class="ujs-reload-import-button" style="padding: 5px" >Import</button>
                <button class="ujs-reload-merge-button"  style="padding: 5px" >Merge</button>
              </div>
              <div>
                <button class="ujs-reload-setting-button" style="padding: 5px" title="Reload the web page to apply changes">Reload page</button>
                <button class="ujs-close-setting-button" style="padding: 5px" title="Just close this popup.\nNote: You need to reload the web page to apply changes.">Close popup</button>
              </div>
          </div>
          <hr>
          <h4 style="margin: 0; padding-left: 8px; color: #444;">Notes:</h4>
          <ul style="margin: 2px; padding-left: 16px; color: #444;">
            <li><b>Reload the page</b> to apply changes.</li>
            <li><b>*</b>-marked settings are language dependent. Currently, the follow languages are supported:<br/> "en", "ru", "es", "zh", "ja".</li>
            <li hidden>The extension downloads only from twitter.com, not from <b>mobile</b>.twitter.com</li>
          </ul>
      </div>
  </div>`);

    async function onDone(button) {
        button.classList.remove("ujs-btn-error");
        button.classList.add("ujs-btn-done");
        await sleep(900);
        button.classList.remove("ujs-btn-done");
    }
    async function onError(button, err) {
        button.classList.remove("ujs-btn-done");
        button.classList.add("ujs-btn-error");
        button.title = err.message;
        await sleep(1800);
        button.classList.remove("ujs-btn-error");
    }

    const exportButton = document.querySelector("body > .ujs-modal-wrapper .ujs-reload-export-button");
    const importButton = document.querySelector("body > .ujs-modal-wrapper .ujs-reload-import-button");
    const mergeButton  = document.querySelector("body > .ujs-modal-wrapper .ujs-reload-merge-button");

    exportButton.addEventListener("click", (event) => {
        const button = event.currentTarget;
        historyHelper.exportHistory(() => onDone(button));
    });
    sleep(50).then(() => {
        const infoObj = getStoreInfo();
        exportButton.title = Object.entries(infoObj).reduce((acc, [key, value]) => {
            acc += `${key}: ${value}\n`;
            return acc;
        }, "");
    });

    importButton.addEventListener("click", (event) => {
        const button = event.currentTarget;
        historyHelper.importHistory(
            () => onDone(button),
            (err) => onError(button, err)
        );
    });
    mergeButton.addEventListener("click", (event) => {
        const button = event.currentTarget;
        historyHelper.mergeHistory(
            () => onDone(button),
            (err) => onError(button, err)
        );
    });

    document.querySelector("body > .ujs-modal-wrapper .ujs-reload-setting-button").addEventListener("click", () => {
        location.reload();
    });

    const checkboxList = document.querySelectorAll("body > .ujs-modal-wrapper input[type=checkbox], body > .ujs-modal-wrapper input[type=radio]");
    checkboxList.forEach(checkbox => {
        checkbox.addEventListener("change", saveSetting);
    });

    document.querySelector("body > .ujs-modal-wrapper .ujs-close-setting-button").addEventListener("click", closeSetting);

    function saveSetting() {
        const entries = [...document.querySelectorAll("body > .ujs-modal-wrapper input[type=checkbox]")]
            .map(checkbox => [checkbox.name, checkbox.checked]);
        const radioEntries = [...document.querySelectorAll("body > .ujs-modal-wrapper input[type=radio]")]
            .map(checkbox => [checkbox.value, checkbox.checked])
        const settings = Object.fromEntries([entries, radioEntries].flat());
        // verbose && console.log("[ujs][save-settings]", settings);
        localStorage.setItem(StorageNames.settings, JSON.stringify(settings));
    }

    function closeSetting() {
        document.body.classList.remove("ujs-no-scroll");
        document.body.classList.remove("ujs-scrollbar-width-margin-right");
        document.querySelector("html").classList.remove("ujs-scroll-initial");
        document.querySelector("body > .ujs-modal-wrapper")?.remove();
    }


}

// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
// --- Twitter Specific code --- //

const downloadedImages        = new LS(StorageNames.downloadedImageNames);
const downloadedImageTweetIds = new LS(StorageNames.downloadedImageTweetIds);
const downloadedVideoTweetIds = new LS(StorageNames.downloadedVideoTweetIds);

// --- That to use for the image history --- //
/** @type {"TWEET_ID" | "IMAGE_NAME"} */
const imagesHistoryBy = LS.getItem(StorageNames.settingsImageHistoryBy, "IMAGE_NAME"); // Hidden settings
// With "TWEET_ID" downloading of 1 image of 4 will mark all 4 images as "already downloaded"
// on the next time when the tweet will appear.
// "IMAGE_NAME" will count each image of a tweet, but it will take more data to store.


// ---------------------------------------------------------------------------------------------------------------------
// --- Twitter.Features --- //
function hoistFeatures() {
    class Features {
        static createButton({url, downloaded, isVideo, isThumb, isMultiMedia}) {
            const btn = document.createElement("div");
            btn.innerHTML = `
<div class="ujs-btn-common ujs-btn-background"></div>
<div class="ujs-btn-common ujs-hover"></div>
<div class="ujs-btn-common ujs-shadow"></div>
<div class="ujs-btn-common ujs-progress" style="--progress: 0%"></div>
<div class="ujs-btn-common ujs-btn-error-text"></div>`.slice(1);
            btn.classList.add("ujs-btn-download");
            if (!downloaded) {
                btn.classList.add("ujs-not-downloaded");
            } else {
                btn.classList.add("ujs-already-downloaded");
            }
            if (isVideo) {
                btn.classList.add("ujs-video");
            }
            if (url) {
                btn.dataset.url = url;
            }
            if (isThumb) {
                btn.dataset.thumb = "true";
            }
            if (isMultiMedia) {
                btn.dataset.isMultiMedia = "true";
            }
            return btn;
        }

        static _markButtonAsDownloaded(btn) {
            btn.classList.remove("ujs-downloading");
            btn.classList.remove("ujs-recently-downloaded");
            btn.classList.add("ujs-downloaded");
            btn.addEventListener("pointerenter", e => {
                btn.classList.add("ujs-recently-downloaded");
            }, {once: true});
        }

        // Banner/Background
        static async _downloadBanner(url, btn) {
            const username = location.pathname.slice(1).split("/")[0];

            btn.classList.add("ujs-downloading");

            // https://pbs.twimg.com/profile_banners/34743251/1596331248/1500x500
            const {
                id, seconds, res
            } = url.match(/(?<=\/profile_banners\/)(?<id>\d+)\/(?<seconds>\d+)\/(?<res>\d+x\d+)/)?.groups || {};

            const {blob, lastModifiedDate, extension, name} = await fetchResource(url);

            Features.verifyBlob(blob, url, btn);

            const filename = `[twitter][bg] ${username}—${lastModifiedDate}—${id}—${seconds}.${extension}`;
            downloadBlob(blob, filename, url);

            Features._markButtonAsDownloaded(btn);
        }

        static _ImageHistory = class {
            static getImageNameFromUrl(url) {
                const _url = new URL(url);
                const {filename} = (_url.origin + _url.pathname).match(/(?<filename>[^\/]+$)/).groups;
                return filename.match(/^[^.]+/)[0]; // remove extension
            }
            static isDownloaded({id, url}) {
                if (imagesHistoryBy === "TWEET_ID") {
                    return downloadedImageTweetIds.hasItem(id);
                } else if (imagesHistoryBy === "IMAGE_NAME") {
                    const name = Features._ImageHistory.getImageNameFromUrl(url);
                    return downloadedImages.hasItem(name);
                }
            }
            static async markDownloaded({id, url}) {
                if (imagesHistoryBy === "TWEET_ID") {
                    await downloadedImageTweetIds.pushItem(id);
                } else if (imagesHistoryBy === "IMAGE_NAME") {
                    const name = Features._ImageHistory.getImageNameFromUrl(url);
                    await downloadedImages.pushItem(name);
                }
            }
        }
        static async imagesHandler() {
            verbose && console.log("[ujs][imagesHandler]");
            const images = document.querySelectorAll(`img:not([data-handled]):not([src$=".svg"])`);
            for (const img of images) {
                if (img.dataset.handled) {
                    continue;
                }
                img.dataset.handled = "true";
                if (img.width === 0) {
                    const imgOnload = new Promise(async (resolve) => {
                        img.onload = resolve;
                    });
                    await Promise.any([imgOnload, sleep(500)]);
                    await sleep(10); // to get updated img.width
                }
                if (img.width < 140) {
                    continue;
                }
                verbose && console.log("[ujs][imagesHandler]", {img, img_width: img.width});

                let anchor = img.closest("a");
                // if expanded_url (an image is _opened_ "https://twitter.com/UserName/status/1234567890123456789/photo/1" [fake-url])
                if (!anchor) {
                    anchor = img.parentNode;
                }

                const listitemEl = img.closest(`li[role="listitem"]`);
                const isThumb = Boolean(listitemEl); // isMediaThumbnail

                if (isThumb && anchor.querySelector("svg")) {
                    await Features.multiMediaThumbHandler(img);
                    continue;
                }

                const isMobileVideo = img.src.includes("ext_tw_video_thumb") || img.src.includes("amplify_video_thumb") || img.closest(`a[aria-label="Embedded video"]`) || img.alt === "Animated Text GIF" || img.alt === "Embedded video"
                                   || img.src.includes("tweet_video_thumb") /* GIF thumb */;
                if (isMobileVideo) {
                    await Features.mobileVideoHandler(img, isThumb); // thumbVideoHandler
                    continue;
                }

                const btn = Features.createButton({url: img.src, isThumb});
                btn.addEventListener("click", Features._imageClickHandler);
                anchor.append(btn);

                const downloaded = Features._ImageHistory.isDownloaded({
                    id: Tweet.of(btn).id,
                    url: btn.dataset.url
                });
                if (downloaded) {
                    btn.classList.add("ujs-already-downloaded");
                }
            }
        }
        static async _imageClickHandler(event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const btn = event.currentTarget;
            let url = btn.dataset.url;

            const isBanner = url.includes("/profile_banners/");
            if (isBanner) {
                return Features._downloadBanner(url, btn);
            }

            const {id, author} = Tweet.of(btn);
            verbose && console.log("[ujs][_imageClickHandler]", {id, author});

            await Features._downloadPhotoMediaEntry(id, author, url, btn);
            Features._markButtonAsDownloaded(btn);
        }
        static async _downloadPhotoMediaEntry(id, author, url, btn) {
            const btnErrorTextElem = btn.querySelector(".ujs-btn-error-text");
            const btnProgress = btn.querySelector(".ujs-progress");
            if (btn.textContent !== "") {
                btnErrorTextElem.textContent = "";
            }
            btn.classList.remove("ujs-error");
            btn.classList.add("ujs-downloading");

            let onProgress = null;
            if (settings.downloadProgress) {
                onProgress = ({loaded, total}) => btnProgress.style.cssText = "--progress: " + loaded / total * 90 + "%";
            }

            const originals = ["orig", "4096x4096"];
            const samples = ["large", "medium", "900x900", "small", "360x360", /*"240x240", "120x120", "tiny"*/];
            let isSample = false;
            const previewSize = new URL(url).searchParams.get("name");
            if (!samples.includes(previewSize)) {
                samples.push(previewSize);
            }

            function handleImgUrl(url) {
                const urlObj = new URL(url);
                if (originals.length) {
                    urlObj.searchParams.set("name", originals.shift());
                } else if (samples.length) {
                    isSample = true;
                    urlObj.searchParams.set("name", samples.shift());
                } else {
                    throw new Error("All fallback URLs are failed to download.");
                }
                if (urlObj.searchParams.get("format") === "webp") {
                    urlObj.searchParams.set("format", "jpg");
                }
                url = urlObj.toString();
                verbose && console.log("[ujs][handleImgUrl][url]", url);
                return url;
            }

            async function safeFetchResource(url) {
                while (true) {
                    url = handleImgUrl(url);
                    try {
                        const result = await fetchResource(url, onProgress);
                        if (result.status === 404) {
                            const urlObj = new URL(url);
                            const params = urlObj.searchParams;
                            if (params.get("name") === "orig" && params.get("format") === "jpg") {
                                params.set("format", "png");
                                url = urlObj.toString();
                                return await fetchResource(url, onProgress);
                            }
                        }
                        return result;
                    } catch (err) {
                        if (!originals.length) {
                            btn.classList.add("ujs-error");
                            btnErrorTextElem.textContent = "";
                            // Add ⚠
                            btnErrorTextElem.style = `background-image: url("https://abs-0.twimg.com/emoji/v2/svg/26a0.svg"); background-size: 1.5em; background-position: center; background-repeat: no-repeat;`;
                            btn.title = "[warning] Original images are not available.";
                        }

                        const ffAutoAllocateChunkSizeBug = err.message.includes("autoAllocateChunkSize"); // https://bugzilla.mozilla.org/show_bug.cgi?id=1757836
                        if (!samples.length || ffAutoAllocateChunkSizeBug) {
                            btn.classList.add("ujs-error");
                            btnErrorTextElem.textContent = "";
                            // Add ❌
                            btnErrorTextElem.style = `background-image: url("https://abs-0.twimg.com/emoji/v2/svg/274c.svg"); background-size: 1.5em; background-position: center; background-repeat: no-repeat;`;

                            const ffHint = isFirefox && !settings.strictTrackingProtectionFix && ffAutoAllocateChunkSizeBug ? "\nTry to enable 'Strict Tracking Protection Fix' in the userscript settings." : "";
                            btn.title = "Failed to download the image." + ffHint;
                            throw new Error("[error] Fallback URLs are failed.");
                        }
                    }
                }
            }

            const {blob, lastModifiedDate, extension, name} = await safeFetchResource(url);

            Features.verifyBlob(blob, url, btn);

            btnProgress.style.cssText = "--progress: 100%";

            const sampleText = !isSample ? "" : "[sample]";
            const filename = `[twitter]${sampleText} ${author}—${lastModifiedDate}—${id}—${name}.${extension}`;
            downloadBlob(blob, filename, url);

            const downloaded = btn.classList.contains("ujs-already-downloaded") || btn.classList.contains("ujs-downloaded");
            if (!downloaded && !isSample) {
                await Features._ImageHistory.markDownloaded({id, url});
            }

            if (btn.dataset.isMultiMedia && !isSample) { // dirty fix
                const isDownloaded = Features._ImageHistory.isDownloaded({id, url});
                if (!isDownloaded) {
                    await Features._ImageHistory.markDownloaded({id, url});
                }
            }

            await sleep(40);
            btnProgress.style.cssText = "--progress: 0%";
        }


        // Quick Dirty Fix // todo refactor
        static async mobileVideoHandler(imgElem, isThumb) { // thumbVideoHandler // todo rename?
            verbose && console.log("[ujs][mobileVideoHandler][vid]", imgElem);

            const btn = Features.createButton({isVideo: true, url: imgElem.src, isThumb});
            btn.addEventListener("click", Features._videoClickHandler);

            let anchor = imgElem.closest("a");
            if (!anchor) {
                anchor = imgElem.parentNode;
            }
            anchor.append(btn);

            const tweet = Tweet.of(btn);
            const id = tweet.id;
            const tweetElem = tweet.elem || btn.closest(`[data-testid="tweet"]`);
            let vidNumber = 0;

            if (tweetElem) {
                const map = Features.tweetVidWeakMapMobile;
                if (map.has(tweetElem)) {
                    vidNumber = map.get(tweetElem) + 1;
                    map.set(tweetElem, vidNumber);
                } else {
                    map.set(tweetElem, vidNumber); // can throw an error for null
                }
            } // else thumbnail

            const historyId = vidNumber ? id + "-" + vidNumber : id;

            const downloaded = downloadedVideoTweetIds.hasItem(historyId);
            if (downloaded) {
                btn.classList.add("ujs-already-downloaded");
            }
        }


        static async multiMediaThumbHandler(imgElem) {
            verbose && console.log("[ujs][multiMediaThumbHandler]", imgElem);
            let isVideo = false;
            if (imgElem.src.includes("/ext_tw_video_thumb/") || imgElem.src.includes("/amplify_video_thumb/")) {
                isVideo = true;
            }

            const btn = Features.createButton({url: imgElem.src, isVideo, isThumb: true, isMultiMedia: true});
            btn.addEventListener("click", Features._multiMediaThumbClickHandler);
            let anchor = imgElem.closest("a");
            if (!anchor) {
                anchor = imgElem.parentNode;
            }
            anchor.append(btn);

            let downloaded;
            const tweetId = Tweet.of(btn).id;
            if (isVideo) {
                downloaded = downloadedVideoTweetIds.hasItem(tweetId);
            } else {
                downloaded = Features._ImageHistory.isDownloaded({
                    id: tweetId,
                    url: btn.dataset.url
                });
            }
            if (downloaded) {
                btn.classList.add("ujs-already-downloaded");
            }
        }
        static async _multiMediaThumbClickHandler(event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const btn = event.currentTarget;
            const btnErrorTextElem = btn.querySelector(".ujs-btn-error-text");
            if (btn.textContent !== "") {
                btnErrorTextElem.textContent = "";
            }
            const {id} = Tweet.of(btn);
            /** @type {TweetMediaEntry[]} */
            let medias;
            try {
                medias = await API.getTweetMedias(id);
                medias = medias.filter(mediaEntry => mediaEntry.tweet_id === id);
            } catch (err) {
                console.error(err);
                btn.classList.add("ujs-error");
                btnErrorTextElem.textContent = "Error";
                btn.title = "API.getTweetMedias Error";
                throw new Error("API.getTweetMedias Error");
            }

            for (const mediaEntry of medias) {
                if (mediaEntry.type === "video") {
                    await Features._downloadVideoMediaEntry(mediaEntry, btn, id);
                } else { // "photo"
                    const {screen_name: author,download_url: url, tweet_id: id} = mediaEntry;
                    await Features._downloadPhotoMediaEntry(id, author, url, btn);
                }
                await sleep(50);
            }
            Features._markButtonAsDownloaded(btn);
        }

        static tweetVidWeakMapMobile = new WeakMap();
        static tweetVidWeakMap = new WeakMap();
        static async videoHandler() {
            const videos = document.querySelectorAll("video:not([data-handled])");
            for (const vid of videos) {
                if (vid.dataset.handled) {
                    continue;
                }
                vid.dataset.handled = "true";
                verbose && console.log("[ujs][videoHandler][vid]", vid);

                const poster = vid.getAttribute("poster");

                const btn = Features.createButton({isVideo: true, url: poster});
                btn.addEventListener("click", Features._videoClickHandler);

                let elem = vid.closest(`[data-testid="videoComponent"]`).parentNode;
                if (elem) {
                    elem.append(btn);
                } else {
                    elem = vid.parentNode.parentNode.parentNode;
                    elem.after(btn);
                }


                const tweet = Tweet.of(btn);
                const id = tweet.id;
                const tweetElem = tweet.elem;
                let vidNumber = 0;

                if (tweetElem) {
                    const map = Features.tweetVidWeakMap;
                    if (map.has(tweetElem)) {
                        vidNumber = map.get(tweetElem) + 1;
                        map.set(tweetElem, vidNumber);
                    } else {
                        map.set(tweetElem, vidNumber); // can throw an error for null
                    }
                } else { // expanded_url
                    await sleep(10);
                    const match = location.pathname.match(/(?<=\/video\/)\d/);
                    if (!match) {
                        verbose && console.log("[ujs][videoHandler] missed match for match");
                    }
                    vidNumber = Number(match[0]) - 1;

                    console.warn("[ujs][videoHandler] vidNumber", vidNumber);
                    // todo: add support for expanded_url video downloading
                }

                const historyId = vidNumber ? id + "-" + vidNumber : id;

                const downloaded = downloadedVideoTweetIds.hasItem(historyId);
                if (downloaded) {
                    btn.classList.add("ujs-already-downloaded");
                }
            }
        }
        static async _videoClickHandler(event) { // todo: parse the URL from HTML (For "Embedded video" (?))
            event.preventDefault();
            event.stopImmediatePropagation();

            const btn = event.currentTarget;
            const btnErrorTextElem = btn.querySelector(".ujs-btn-error-text");
            const {id} = Tweet.of(btn);

            if (btn.textContent !== "") {
                btnErrorTextElem.textContent = "";
            }
            btn.classList.remove("ujs-error");
            btn.classList.add("ujs-downloading");

            let mediaEntry;
            try {
                const medias = await API.getTweetMedias(id);
                const posterUrl = btn.dataset.url; // [note] if `posterUrl` has `searchParams`, it will have no extension at the end of `pathname`.
                const posterUrlClear = removeSearchParams(posterUrl);
                mediaEntry = medias.find(media => media.preview_url.startsWith(posterUrlClear));
                verbose && console.log("[ujs][_videoClickHandler] mediaEntry", mediaEntry);
            } catch (err) {
                console.error(err);
                btn.classList.add("ujs-error");
                btnErrorTextElem.textContent = "Error";
                btn.title = "API.getVideoInfo Error";
                throw new Error("API.getVideoInfo Error");
            }
            try {
                await Features._downloadVideoMediaEntry(mediaEntry, btn, id);
            } catch (err) {
                console.error(err);
                btn.classList.add("ujs-error");
                btnErrorTextElem.textContent = "Error";
                btn.title = err.message + " Error";
                throw err;
            }
            Features._markButtonAsDownloaded(btn);
        }

        static async _downloadVideoMediaEntry(mediaEntry, btn, id /* of original tweet */) {
            if (!mediaEntry) {
                throw new Error("No mediaEntry found");
            }
            const {
                screen_name:  author,
                tweet_id:     videoTweetId,
                download_url: url,
                type_index:   vidNumber,
            } = mediaEntry;
            if (!url) {
                throw new Error("No video URL found");
            }

            const btnProgress = btn.querySelector(".ujs-progress");

            let onProgress = null;
            if (settings.downloadProgress) {
                onProgress = ({loaded, total}) => btnProgress.style.cssText = "--progress: " + loaded / total * 90 + "%";
            }

            async function safeFetchResource(url, onProgress) {
                try {
                    return await fetchResource(url, onProgress);
                } catch (err) {
                    const btnErrorTextElem = btn.querySelector(".ujs-btn-error-text");
                    const ffAutoAllocateChunkSizeBug = err.message.includes("autoAllocateChunkSize"); // https://bugzilla.mozilla.org/show_bug.cgi?id=1757836
                    btn.classList.add("ujs-error");
                    btnErrorTextElem.textContent = "";
                    // Add ❌
                    btnErrorTextElem.style = `background-image: url("https://abs-0.twimg.com/emoji/v2/svg/274c.svg"); background-size: 1.5em; background-position: center; background-repeat: no-repeat;`;

                    const ffHint = isFirefox && !settings.strictTrackingProtectionFix && ffAutoAllocateChunkSizeBug ? "\nTry to enable 'Strict Tracking Protection Fix' in the userscript settings." : "";
                    btn.title = "Video download failed." + ffHint;
                    throw new Error("[error] Video download failed.");
                }
            }

            const {blob, lastModifiedDate, extension, name} = await safeFetchResource(url, onProgress);

            btnProgress.style.cssText = "--progress: 100%";

            Features.verifyBlob(blob, url, btn);

            const filename = `[twitter] ${author}—${lastModifiedDate}—${videoTweetId}—${name}.${extension}`;
            downloadBlob(blob, filename, url);

            const downloaded = btn.classList.contains("ujs-already-downloaded");
            const historyId = vidNumber /* not 0 */ ? videoTweetId + "-" + vidNumber : videoTweetId;
            if (!downloaded) {
                await downloadedVideoTweetIds.pushItem(historyId);
                if (videoTweetId !== id) { // if QRT
                    const historyId = vidNumber ? id + "-" + vidNumber : id;
                    await downloadedVideoTweetIds.pushItem(historyId);
                }
            }

            if (btn.dataset.isMultiMedia) { // dirty fix
                const isDownloaded = downloadedVideoTweetIds.hasItem(historyId);
                if (!isDownloaded) {
                    await downloadedVideoTweetIds.pushItem(historyId);
                    if (videoTweetId !== id) { // if QRT
                        const historyId = vidNumber ? id + "-" + vidNumber : id;
                        await downloadedVideoTweetIds.pushItem(historyId);
                    }
                }
            }

            await sleep(40);
            btnProgress.style.cssText = "--progress: 0%";
        }

        static verifyBlob(blob, url, btn) {
            if (!blob.size) {
                btn.classList.add("ujs-error");
                btn.querySelector(".ujs-btn-error-text").textContent = "Error";
                btn.title = "Download Error";
                throw new Error("Zero size blob: " + url);
            }
        }

        static addRequiredCSS() {
            const code = getUserScriptCSS();
            addCSS(code);
        }

        // it depends on `directLinks()` use only it after `directLinks()`
        static handleTitle(title) {

            if (!I18N.QUOTES) { // Unsupported lang, no QUOTES, ON_TWITTER, TWITTER constants
                return;
            }

            // if not an opened tweet
            if (!location.href.match(/(twitter|x)\.com\/[^\/]+\/status\/\d+/)) {
                return;
            }

            let titleText = title || document.title;
            if (titleText === Features.lastHandledTitle) {
                return;
            }
            Features.originalTitle = titleText;

            const [OPEN_QUOTE, CLOSE_QUOTE] = I18N.QUOTES;
            const urlsToReplace = [
                ...titleText.matchAll(new RegExp(`https:\\/\\/t\\.co\\/[^ ${CLOSE_QUOTE}]+`, "g"))
            ].map(el => el[0]);
            // the last one may be the URL to the tweet // or to an embedded shared URL

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

            titleText = titleText.replace(new RegExp(`${I18N.ON_TWITTER}(?= ${OPEN_QUOTE})`), ":");
            titleText = titleText.replace(new RegExp(`(?<=${CLOSE_QUOTE}) \\\/ ${I18N.TWITTER}$`), "");
            if (!lastUrlIsAttachment) {
                const regExp = new RegExp(`(?<short> https:\\/\\/t\\.co\\/.{6,14})${CLOSE_QUOTE}$`);
                titleText = titleText.replace(regExp, (match, p1, p2, offset, string) => `${CLOSE_QUOTE} —${p1}`);
            } else {
                titleText = titleText.replace(lastUrl, `${lastUrl} (${attachmentDescription})`);
            }
            document.title = titleText; // Note: some characters will be removed automatically (`\n`, extra spaces)
            Features.lastHandledTitle = document.title;
        }
        static lastHandledTitle = "";
        static originalTitle = "";

        static profileUrlCache = new Map();
        static async directLinks() {
            verbose && console.log("[ujs][directLinks]");
            const hasHttp = url => Boolean(url.match(/^https?:\/\//));
            const anchors = xpathAll(`.//a[starts-with(@href, "https://t.co/") and @dir="ltr" and child::span and not(@data-handled)]`);
            for (const anchor of anchors) {
                const redirectUrl = new URL(anchor.href);
                const shortUrl = redirectUrl.origin + redirectUrl.pathname; // remove "?amp=1"

                const hrefAttr = anchor.getAttribute("href");
                verbose && console.log("[ujs][directLinks]", {hrefAttr, redirectUrl_href: redirectUrl.href, shortUrl});

                anchor.dataset.redirect = shortUrl;
                anchor.dataset.handled = "true";
                anchor.rel = "nofollow noopener noreferrer";

                if (Features.profileUrlCache.has(shortUrl)) {
                    anchor.href = Features.profileUrlCache.get(shortUrl);
                    continue;
                }

                const nodes = xpathAll(`.//span[text() != "…"] | ./text()`, anchor);
                let url = nodes.map(node => node.textContent).join("");

                const doubleProtocolPrefix = url.match(/(?<dup>^https?:\/\/)(?=https?:)/)?.groups.dup;
                if (doubleProtocolPrefix) {
                    url = url.slice(doubleProtocolPrefix.length);
                    const span = anchor.querySelector(`[aria-hidden="true"]`);
                    if (hasHttp(span.textContent)) { // Fix Twitter's bug related to text copying
                        span.style = "display: none;";
                    }
                }

                anchor.href = url;

                if (anchor.dataset?.testid === "UserUrl") {
                    const href = anchor.getAttribute("href");
                    const profileUrl = hasHttp(href) ? href : "https://" + href;
                    anchor.href = profileUrl;
                    verbose && console.log("[ujs][directLinks][profileUrl]", profileUrl);

                    // Restore if URL's text content is too long
                    if (anchor.textContent.endsWith("…")) {
                        anchor.href = shortUrl;

                        try {
                            const author = location.pathname.slice(1).match(/[^\/]+/)[0];
                            const expanded_url = await API.getUserInfo(author); // todo: make lazy
                            anchor.href = expanded_url;
                            Features.profileUrlCache.set(shortUrl, expanded_url);
                        } catch (err) {
                            verbose && console.error("[ujs]", err);
                        }
                    }
                }
            }
            if (anchors.length) {
                Features.handleTitle(Features.originalTitle);
            }
        }

        // Do NOT throttle it
        static expandSpoilers() {
            const main = document.querySelector("main[role=main]");
            if (!main) {
                return;
            }

            if (!I18N.YES_VIEW_PROFILE) { // Unsupported lang, no YES_VIEW_PROFILE, SHOW_NUDITY, VIEW constants
                return;
            }

            const a = main.querySelectorAll("[data-testid=primaryColumn] [role=button]");
            if (a) {
                const elems = [...a];
                const button = elems.find(el => el.textContent === I18N.YES_VIEW_PROFILE);
                if (button) {
                    button.click();
                }

                // "Content warning: Nudity"
                // "The Tweet author flagged this Tweet as showing sensitive content."
                // "Show"
                const buttonShow = elems.find(el => el.textContent === I18N.SHOW_NUDITY);
                if (buttonShow) {
                    // const verifying = a.previousSibling.textContent.includes("Nudity"); // todo?
                    // if (verifying) {
                    buttonShow.click();
                    // }
                }
            }

            // todo: expand spoiler commentary in photo view mode (.../photo/1)
            const b = main.querySelectorAll("article [role=presentation] div[role=button]");
            if (b) {
                const elems = [...b];
                const buttons = elems.filter(el => el.textContent === I18N.VIEW);
                if (buttons.length) {
                    buttons.forEach(el => el.click());
                }
            }
        }

        static hideSignUpSection() { // "New to Twitter?"
            if (!I18N.SIGNUP) {// Unsupported lang, no SIGNUP constant
                return;
            }
            const elem = document.querySelector(`section[aria-label="${I18N.SIGNUP}"][role=region]`);
            if (elem) {
                elem.parentNode.classList.add("ujs-hidden");
            }
        }

        // Call it once.
        // "Don’t miss what’s happening" if you are not logged in.
        // It looks that `#layers` is used only for this bar.
        static hideSignUpBottomBarAndMessages(doNotPlayVideosAutomatically) {
            if (doNotPlayVideosAutomatically) {
                addCSS(`
                    #layers > div:nth-child(1) {
                        display: none;
                    }
                `);
            } else {
                addCSS(`
                    #layers > div:nth-child(1) {
                        height: 1px;
                        opacity: 0;
                    }
                `);
            }
        }

        // "Trends for you"
        static hideTrends() {
            if (!I18N.TRENDS) { // Unsupported lang, no TRENDS constant
                return;
            }
            addCSS(`
                [aria-label="${I18N.TRENDS}"]
                {
                    display: none;
                }
            `);
        }

        static highlightVisitedLinks() {
            if (settings.highlightOnlySpecialVisitedLinks) {
                addCSS(`
                    a[href^="http"]:visited {
                        color: darkorange !important;
                    }
                `);
                return;
            }
            addCSS(`
                a:visited {
                    color: darkorange !important;
                }
            `);
        }

        // todo split to two methods
        // todo fix it, currently it works questionably
        // not tested with non eng languages
        static footerHandled = false;
        static hideAndMoveFooter() { // "Terms of Service   Privacy Policy   Cookie Policy"
            let footer = document.querySelector(`main[role=main] nav[aria-label=${I18N.FOOTER}][role=navigation]`);
            const nav  = document.querySelector("nav[aria-label=Primary][role=navigation]"); // I18N."Primary" [?]

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

        static hideLoginPopup() { // When you are not logged in
            const targetNode = document.querySelector("html");
            const observerOptions = {
                attributes: true,
            };
            const observer = new MutationObserver(callback);
            observer.observe(targetNode, observerOptions);

            function callback(mutationList, _observer) {
                const html = document.querySelector("html");
                verbose && console.log("[ujs][hideLoginPopup][mutationList]", mutationList);
                // overflow-y: scroll; overscroll-behavior-y: none; font-size: 15px;                     // default
                // overflow: hidden; overscroll-behavior-y: none; font-size: 15px; margin-right: 15px;   // popup
                if (html.style["overflow"] === "hidden") {
                    html.style["overflow"] = "";
                    html.style["overflow-y"] = "scroll";
                    html.style["margin-right"] = "";
                }
                const popup = document.querySelector(`#layers div[data-testid="sheetDialog"]`);
                if (popup) {
                    popup.closest(`div[role="dialog"]`).remove();
                    verbose && (document.title = "⚒" + document.title);
                    // observer.disconnect();
                }
            }
        }

        static goFromMobileToMainSite() { // uncompleted
            if (location.href.startsWith("https://mobile.twitter.com/")) {
                location.href = location.href.replace("https://mobile.twitter.com/", "https://twitter.com/");
            }
            // TODO: add #redirected, remove by timer // to prevent a potential infinity loop
        }
    }

    return Features;
}

function getStoreInfo() {
    const resultObj = {
        total: 0
    };
    for (const [name, lsKey] of Object.entries(StorageNames)) {
        const valueStr = localStorage.getItem(lsKey);
        if (valueStr) {
            try {
                const value = JSON.parse(valueStr);
                if (Array.isArray(value)) {
                    const size = new Set(value).size;
                    resultObj[name] = size;
                    resultObj.total += size;
                }
            } catch (err) {
                // ...
            }
        }
    }
    return resultObj;
}

// --- Twitter.RequiredCSS --- //
function getUserScriptCSS() {
    const labelText = I18N.IMAGE || "Image";

    // By default, the scroll is showed all time, since <html style="overflow-y: scroll;>,
    // so it works — no need to use `getScrollbarWidth` function from SO (13382516).
    const scrollbarWidth = window.innerWidth - document.body.offsetWidth;

    const css = `
.ujs-modal-wrapper .ujs-modal-settings {
  color: black;
}
.ujs-hidden {
    display: none;
}
.ujs-no-scroll {
    overflow-y: hidden;
}
.ujs-scroll-initial {
    overflow-y: initial!important;
}
.ujs-scrollbar-width-margin-right {
    margin-right: ${scrollbarWidth}px;
}

.ujs-show-on-hover:hover {
    opacity: 1;
    transition: opacity 1s ease-out 0.1s;
}
.ujs-show-on-hover {
    opacity: 0;
    transition: opacity 0.5s ease-out;
}

:root {
    --ujs-shadow-1: linear-gradient(to top, rgba(0,0,0,0.15), rgba(0,0,0,0.05));
    --ujs-shadow-2: linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0.05));
    --ujs-shadow-3: linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.15));
    --ujs-shadow-4: linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.25));
    --ujs-red:   #e0245e;
    --ujs-blue:  #1da1f2;
    --ujs-green: #4caf50;
    --ujs-gray:  #c2cbd0;
    --ujs-error: white;
}

.ujs-progress {
  background-image: linear-gradient(to right, var(--ujs-green) var(--progress), transparent 0%);
}

.ujs-shadow {
  background-image: var(--ujs-shadow-1);
}
.ujs-btn-download:hover .ujs-hover {
  background-image: var(--ujs-shadow-2);
}
.ujs-btn-download.ujs-downloading .ujs-shadow {
  background-image: var(--ujs-shadow-3);
}
.ujs-btn-download:active .ujs-shadow {
  background-image: var(--ujs-shadow-4);
}

.ujs-btn-download.ujs-downloaded.ujs-recently-downloaded {
    opacity: 0;
}

li[role="listitem"]:hover .ujs-btn-download {
    opacity: 1;
}
article[role=article]:hover .ujs-btn-download {
    opacity: 1;
}
div[aria-label="${labelText}"]:hover .ujs-btn-download {
    opacity: 1;
}
.ujs-btn-download.ujs-downloaded {
    opacity: 1;
}
.ujs-btn-download.ujs-downloading {
    opacity: 1;
}
[data-testid="videoComponent"]:hover + .ujs-btn-download {
    opacity: 1;
}
[data-testid="videoComponent"] + .ujs-btn-download:hover {
    opacity: 1;
}

.ujs-btn-download {
  cursor: pointer;
  top: 0.5em;
  left: 0.5em;
  position: absolute;
  opacity: 0;
}
.ujs-btn-common {
  width: 33px;
  height: 33px;
  border-radius: 0.3em;
  top: 0;
  position: absolute;
  border: 1px solid transparent;
  border-color: var(--ujs-gray);
  ${settings.addBorder ? "border: 2px solid white;" : "border-color: var(--ujs-gray);"}
}
.ujs-not-downloaded .ujs-btn-background {
  background: var(--ujs-red);
}

.ujs-already-downloaded .ujs-btn-background {
  background: var(--ujs-blue);
}

.ujs-btn-done {
  box-shadow: 0 0 6px var(--ujs-green);
}
.ujs-btn-error {
  box-shadow: 0 0 6px var(--ujs-red);
}

.ujs-downloaded .ujs-btn-background {
  background: var(--ujs-green);
}

.ujs-error .ujs-btn-background {
  background: var(--ujs-error);
}

.ujs-btn-error-text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  font-size: 100%;
}`;
    return css.slice(1);
}

/*
Features depend on:

addRequiredCSS:     IMAGE

expandSpoilers:     YES_VIEW_PROFILE, SHOW_NUDITY, VIEW
handleTitle:        QUOTES,           ON_TWITTER,  TWITTER
hideSignUpSection:  SIGNUP
hideTrends:         TRENDS

[unused]
hideAndMoveFooter:  FOOTER
*/

// --- Twitter.LangConstants --- //
function getLanguageConstants() { // todo: "de", "fr"
    const defaultQuotes = [`"`, `"`];

    const SUPPORTED_LANGUAGES = ["en",                     "ru",                     "es",                                 "zh",               "ja",                       ];

    // texts
    const VIEW                = ["View",                   "Посмотреть",             "Ver",                                "查看",             "表示",                      ];
    const YES_VIEW_PROFILE    = ["Yes, view profile",      "Да, посмотреть профиль", "Sí, ver perfil",                     "是，查看个人资料",   "プロフィールを表示する",       ];
    const SHOW_NUDITY         = ["Show",                   "Показать",               "Mostrar",                            "显示",              "表示",                     ];

    // aria-label texts
    const IMAGE               = ["Image",                  "Изображение",            "Imagen",                             "图像",              "画像",                     ];
    const SIGNUP              = ["Sign up",                "Зарегистрироваться",     "Regístrate",                         "注册",             "アカウント作成",              ];
    const TRENDS              = ["Timeline: Trending now", "Лента: Актуальные темы", "Cronología: Tendencias del momento", "时间线：当前趋势",   "タイムライン: トレンド",       ];
    const FOOTER              = ["Footer",                 "Нижний колонтитул",      "Pie de página",                      "页脚",             "フッター",                   ];

    // document.title "{AUTHOR}{ON_TWITTER} {QUOTES[0]}{TEXT}{QUOTES[1]} / {TWITTER}"
    const QUOTES              = [defaultQuotes,            [`«`, `»`],               defaultQuotes,                        defaultQuotes,      [`「`, `」`],                ];
    const ON_TWITTER          = [" on X:",                  " в X:",                 " en X:",                             " 在 X:",            "さんはXを使っています", ];
    const TWITTER             = ["X",                       "X",                      "X",                                  "X",                 "X",                  ];

    const lang = document.querySelector("html").getAttribute("lang");
    const langIndex = SUPPORTED_LANGUAGES.indexOf(lang);

    return {
        SUPPORTED_LANGUAGES,
        VIEW: VIEW[langIndex],
        YES_VIEW_PROFILE: YES_VIEW_PROFILE[langIndex],
        SHOW_NUDITY: SHOW_NUDITY[langIndex],
        IMAGE: IMAGE[langIndex],
        SIGNUP: SIGNUP[langIndex],
        TRENDS: TRENDS[langIndex],
        FOOTER: FOOTER[langIndex],
        QUOTES: QUOTES[langIndex],
        ON_TWITTER: ON_TWITTER[langIndex],
        TWITTER: TWITTER[langIndex],
    }
}

// --- Twitter.Tweet --- //
function hoistTweet() {
    class Tweet {
        constructor({elem, url}) {
            if (url) {
                this.elem = null;
                this.url = url;
            } else {
                this.elem = elem;
                this.url = Tweet.getUrl(elem);
            }
        }

        static of(innerElem) {
            // Workaround for media from a quoted tweet
            const url = innerElem.closest(`a[href^="/"]`)?.href;
            if (url && url.includes("/status/")) {
                return new Tweet({url});
            }

            const elem = innerElem.closest(`[data-testid="tweet"]`);
            if (!elem) { // opened image
                verbose && console.log("[ujs][Tweet.of]", "No-tweet elem");
            }
            return new Tweet({elem});
        }

        static getUrl(elem) {
            if (!elem) {
                verbose && console.log("[ujs][Tweet.getUrl]", "Opened full screen image");
                return location.href;
            }
            const quotedTweetAnchorEl = [...elem.querySelectorAll("a")].find(el => {
                return el.childNodes[0]?.nodeName === "TIME";
            });
            if (quotedTweetAnchorEl) {
                verbose && console.log("[ujs][Tweet.getUrl]", "Quoted/Re Tweet");
                return quotedTweetAnchorEl.href;
            }
            verbose && console.log("[ujs][Tweet.getUrl]", "Unreachable"); // Is it used?
            return location.href;
        }

        get author() {
            return this.url.match(/(?<=(twitter|x)\.com\/).+?(?=\/)/)?.[0];
        }

        get id() {
            return this.url.match(/(?<=\/status\/)\d+/)?.[0];
        }
    }

    return Tweet;
}

// --- Twitter.API --- //
function hoistAPI() {
    class API {
        static guestToken = getCookie("gt");
        static csrfToken  = getCookie("ct0");  // todo: lazy — not available at the first run
        // Guest/Suspended account Bearer token
        static guestAuthorization = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

        // Seems to be outdated at 2022.05
        static async _requestBearerToken() {
            const scriptSrc = [...document.querySelectorAll("script")]
                .find(el => el.src.match(/https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main[\w.]*\.js/)).src;

            let text;
            try {
                text = await (await fetch(scriptSrc)).text();
            } catch (err) {
                /* verbose && */ console.error("[ujs][_requestBearerToken][scriptSrc]", scriptSrc);
                /* verbose && */ console.error("[ujs][_requestBearerToken]", err);
                throw err;
            }

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

        static requestCache = new Map();
        static vacuumCache() {
            if (API.requestCache.size > 16) {
                API.requestCache.delete(API.requestCache.keys().next().value);
            }
        }

        static async apiRequest(url) {
            const _url = url.toString();
            verbose && console.log("[ujs][apiRequest]", _url);

            if (API.requestCache.has(_url)) {
                verbose && console.log("[ujs][apiRequest] Use cached API request", _url);
                return API.requestCache.get(_url);
            }

            // Hm... it is always the same. Even for a logged user.
            // const authorization = API.guestToken ? API.guestAuthorization : await API.getAuthorization();
            const authorization = API.guestAuthorization;

            // for debug
            verbose && sessionStorage.setItem("guestAuthorization", API.guestAuthorization);
            verbose && sessionStorage.setItem("authorization", API.authorization);
            verbose && sessionStorage.setItem("x-csrf-token", API.csrfToken);
            verbose && sessionStorage.setItem("x-guest-token", API.guestToken);

            const headers = new Headers({
                authorization,
                "x-csrf-token": API.csrfToken,
                "x-twitter-client-language": "en",
                "x-twitter-active-user": "yes"
            });
            if (API.guestToken) {
                headers.append("x-guest-token", API.guestToken);
            } else { // may be skipped
                headers.append("x-twitter-auth-type", "OAuth2Session");
            }

            let json;
            try {
                const response = await fetch(_url, {headers});
                json = await response.json();
                if (response.ok) {
                    verbose && console.log("[ujs][apiRequest]", "Cache API request", _url);
                    API.vacuumCache();
                    API.requestCache.set(_url, json);
                }
            } catch (err) {
                /* verbose && */ console.error("[ujs][apiRequest]", _url);
                /* verbose && */ console.error("[ujs][apiRequest]", err);
                throw err;
            }

            verbose && console.log("[ujs][apiRequest][json]", JSON.stringify(json, null, " "));
            // 429 - [{code: 88, message: "Rate limit exceeded"}] — for suspended accounts

            return json;
        }

        static async getTweetJson(tweetId) {
            const url = API.createTweetJsonEndpointUrl(tweetId);
            const json = await API.apiRequest(url);
            verbose && console.log("[ujs][getTweetJson]", json, JSON.stringify(json));
            return json;
        }

        /** return {tweetResult, tweetLegacy, tweetUser} */
        static parseTweetJson(json, tweetId) {
            const instruction = json.data.threaded_conversation_with_injections_v2.instructions.find(ins => ins.type === "TimelineAddEntries");
            const tweetEntry  = instruction.entries.find(ins => ins.entryId === "tweet-" + tweetId);
            let tweetResult = tweetEntry.content.itemContent.tweet_results.result; // {"__typename": "Tweet"} // or {"__typename": "TweetWithVisibilityResults", tweet: {...}} (1641596499351212033)
            if (tweetResult.tweet) {
                tweetResult = tweetResult.tweet;
            }
            verbose && console.log("[ujs][parseTweetJson] tweetResult", tweetResult, JSON.stringify(tweetResult));
            const tweetUser   = tweetResult.core.user_results.result; // {"__typename": "User"}
            const tweetLegacy = tweetResult.legacy;
            verbose && console.log("[ujs][parseTweetJson] tweetLegacy", tweetLegacy, JSON.stringify(tweetLegacy));
            verbose && console.log("[ujs][parseTweetJson] tweetUser", tweetUser, JSON.stringify(tweetUser));
            return {tweetResult, tweetLegacy, tweetUser};
        }

        /**
         * @typedef {Object} TweetMediaEntry
         * @property {string} screen_name - "kreamu"
         * @property {string} tweet_id - "1687962620173733890"
         * @property {string} download_url - "https://pbs.twimg.com/media/FWYvXNMXgAA7se2?format=jpg&name=orig"
         * @property {"photo" | "video"} type - "photo"
         * @property {"photo" | "video" | "animated_gif"} type_original - "photo"
         * @property {number} index - 0
         * @property {number} type_index - 0
         * @property {number} type_index_original - 0
         * @property {string} preview_url - "https://pbs.twimg.com/media/FWYvXNMXgAA7se2.jpg"
         * @property {string} media_id  -   "1687949851516862464"
         * @property {string} media_key - "7_1687949851516862464"
         * @property {string} expanded_url - "https://twitter.com/kreamu/status/1687962620173733890/video/1"
         * @property {string} short_expanded_url - "pic.twitter.com/KeXR8T910R"
         * @property {string} short_tweet_url - "https://t.co/KeXR8T910R"
         * @property {string} tweet_text - "Tracer providing some In-flight entertainment"
         */
        /** @returns {TweetMediaEntry[]} */
        static parseTweetLegacyMedias(tweetResult, tweetLegacy, tweetUser) {
            if (!tweetLegacy.extended_entities || !tweetLegacy.extended_entities.media) {
                return [];
            }

            const medias = [];
            const typeIndex = {}; // "photo", "video", "animated_gif"
            let index = -1;

            for (const media of tweetLegacy.extended_entities.media) {
                index++;
                let   type          = media.type;
                const type_original = media.type;
                typeIndex[type] = (typeIndex[type] === undefined ? -1 : typeIndex[type]) + 1;
                if (type === "animated_gif") {
                    type = "video";
                    typeIndex[type] = (typeIndex[type] === undefined ? -1 : typeIndex[type]) + 1;
                }

                let download_url;
                if (media.video_info) {
                    const videoInfo = media.video_info.variants
                        .filter(el => el.bitrate !== undefined) // if content_type: "application/x-mpegURL" // .m3u8
                        .reduce((acc, cur) => cur.bitrate > acc.bitrate ? cur : acc);
                    download_url = videoInfo.url;
                } else {
                    if (media.media_url_https.includes("?format=")) {
                        download_url = media.media_url_https;
                    } else {
                        // "https://pbs.twimg.com/media/FWYvXNMXgAA7se2.jpg" -> "https://pbs.twimg.com/media/FWYvXNMXgAA7se2?format=jpg&name=orig"
                        const parts = media.media_url_https.split(".");
                        const ext = parts[parts.length - 1];
                        const urlPart = parts.slice(0, -1).join(".");
                        download_url = `${urlPart}?format=${ext}&name=orig`;
                    }
                }

                const screen_name   = tweetUser.legacy.screen_name;              // "kreamu"
                const tweet_id      = tweetResult.rest_id || tweetLegacy.id_str; // "1687962620173733890"

                const type_index          = typeIndex[type];          // 0
                const type_index_original = typeIndex[type_original]; // 0

                const preview_url = media.media_url_https; // "https://pbs.twimg.com/ext_tw_video_thumb/1687949851516862464/pu/img/mTBjwz--nylYk5Um.jpg"
                const media_id    = media.id_str;          //   "1687949851516862464"
                const media_key   = media.media_key;       // "7_1687949851516862464"

                const expanded_url       = media.expanded_url; // "https://twitter.com/kreamu/status/1687962620173733890/video/1"
                const short_expanded_url = media.display_url;  // "pic.twitter.com/KeXR8T910R"
                const short_tweet_url    = media.url;          // "https://t.co/KeXR8T910R"
                const tweet_text = tweetLegacy.full_text       // "Tracer providing some In-flight entertainment https://t.co/KeXR8T910R"
                                              .replace(` ${media.url}`, "");

                // {screen_name, tweet_id, download_url, preview_url, type_index}
                /** @type {TweetMediaEntry} */
                const mediaEntry = {
                    screen_name, tweet_id,
                    download_url, type, type_original, index,
                    type_index, type_index_original,
                    preview_url, media_id, media_key,
                    expanded_url, short_expanded_url, short_tweet_url, tweet_text,
                };
                medias.push(mediaEntry);
            }

            verbose && console.log("[ujs][parseTweetLegacyMedias] medias", medias);
            return medias;
        }

        /**
         * Returns an array like this (https://x.com/kirachem/status/1805456475893928166):
         * [
             {
              "screen_name": "kirachem",
              "tweet_id": "1805456475893928166",
              "download_url": "https://video.twimg.com/amplify_video/1805450004041285634/vid/avc1/1080x1080/2da-wiS9XJ42-9rv.mp4?tag=16",
              "type": "video",
              "type_original": "video",
              "index": 0,
              "type_index": 0,
              "type_index_original": 0,
              "preview_url": "https://pbs.twimg.com/media/GQ4_SPoakAAnW8e.jpg",
              "media_id": "1805450004041285634",
              "media_key": "13_1805450004041285634",
              "expanded_url": "https://twitter.com/kirachem/status/1805456475893928166/video/1",
              "short_expanded_url": "pic.twitter.com/VnOcUSsGaC",
              "short_tweet_url": "https://t.co/VnOcUSsGaC",
              "tweet_text": "Bunny Tifa (Cloud's POV)"
             }
            ]
         */
        static async getTweetMedias(tweetId) {
            const tweetJson = await API.getTweetJson(tweetId);
            const {tweetResult, tweetLegacy, tweetUser} = API.parseTweetJson(tweetJson, tweetId);

            let result = API.parseTweetLegacyMedias(tweetResult, tweetLegacy, tweetUser);

            if (tweetResult.quoted_status_result && tweetResult.quoted_status_result.result /* check is the qouted tweet not deleted */) {
                const tweetResultQuoted = tweetResult.quoted_status_result.result;
                const tweetLegacyQuoted = tweetResultQuoted.legacy;
                const tweetUserQuoted   = tweetResultQuoted.core.user_results.result;
                result = [...result, ...API.parseTweetLegacyMedias(tweetResultQuoted, tweetLegacyQuoted, tweetUserQuoted)];
            }

            return result;
        }

        /*  // dev only snippet (to extract params):
            a = new URL(`https://x.com/i/api/graphql/VwKJcAd7zqlBOitPLUrB8A/TweetDetail?...`);
            console.log("variables",    JSON.stringify(JSON.parse(Object.fromEntries(a.searchParams).variables),    null, "    "))
            console.log("features",     JSON.stringify(JSON.parse(Object.fromEntries(a.searchParams).features),     null, "    "))
            console.log("fieldToggles", JSON.stringify(JSON.parse(Object.fromEntries(a.searchParams).fieldToggles), null, "    "))
        */

        // todo: keep `queryId` updated
        // https://github.com/fa0311/TwitterInternalAPIDocument/blob/master/docs/json/API.json
        static TweetDetailQueryId      = "VwKJcAd7zqlBOitPLUrB8A"; // TweetDetail      (for videos)
        static UserByScreenNameQueryId = "qW5u-DAuXpMEG0zA1F7UGQ"; // UserByScreenName (for the direct user profile url)

        static createTweetJsonEndpointUrl(tweetId) {
            const variables = {
                "focalTweetId": tweetId,
                "with_rux_injections": true,
                "includePromotedContent": true,
                "withCommunity": true,
                "withQuickPromoteEligibilityTweetFields": true,
                "withBirdwatchNotes": true,
                "withVoice": true,
                "withV2Timeline": true
            };
            const features = {
                "rweb_tipjar_consumption_enabled": true,
                "responsive_web_graphql_exclude_directive_enabled": true,
                "verified_phone_label_enabled": false,
                "creator_subscriptions_tweet_preview_api_enabled": true,
                "responsive_web_graphql_timeline_navigation_enabled": true,
                "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
                "communities_web_enable_tweet_community_results_fetch": true,
                "c9s_tweet_anatomy_moderator_badge_enabled": true,
                "articles_preview_enabled": true,
                "tweetypie_unmention_optimization_enabled": true,
                "responsive_web_edit_tweet_api_enabled": true,
                "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
                "view_counts_everywhere_api_enabled": true,
                "longform_notetweets_consumption_enabled": true,
                "responsive_web_twitter_article_tweet_consumption_enabled": true,
                "tweet_awards_web_tipping_enabled": false,
                "creator_subscriptions_quote_tweet_preview_enabled": false,
                "freedom_of_speech_not_reach_fetch_enabled": true,
                "standardized_nudges_misinfo": true,
                "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
                "rweb_video_timestamps_enabled": true,
                "longform_notetweets_rich_text_read_enabled": true,
                "longform_notetweets_inline_media_enabled": true,
                "responsive_web_enhance_cards_enabled": false
            };
            const fieldToggles = {
                "withArticleRichContentState": true,
                "withArticlePlainText": false,
                "withGrokAnalyze": false
            };

            const urlBase = `https://${sitename}.com/i/api/graphql/${API.TweetDetailQueryId}/TweetDetail`;
            const urlObj = new URL(urlBase);
            urlObj.searchParams.set("variables", JSON.stringify(variables));
            urlObj.searchParams.set("features", JSON.stringify(features));
            urlObj.searchParams.set("fieldToggles", JSON.stringify(fieldToggles));
            const url = urlObj.toString();
            return url;
        }

        static async getUserInfo(username) {
            const variables = {
                "screen_name": username,
                "withSafetyModeUserFields": true,
            };
            const features = {
                "creator_subscriptions_tweet_preview_api_enabled": true,
                "hidden_profile_likes_enabled": true,
                "hidden_profile_subscriptions_enabled": true,
                "highlights_tweets_tab_ui_enabled": true,
                "responsive_web_graphql_exclude_directive_enabled": true,
                "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
                "responsive_web_graphql_timeline_navigation_enabled": true,
                "responsive_web_twitter_article_notes_tab_enabled": true,
                "rweb_tipjar_consumption_enabled": true,
                "subscriptions_verification_info_is_identity_verified_enabled": true,
                "subscriptions_verification_info_verified_since_enabled": true,
                "verified_phone_label_enabled": false,
            };
            const fieldToggles = {
                "withAuxiliaryUserLabels": false,
            };

            const urlBase = `https://${sitename}.com/i/api/graphql/${API.UserByScreenNameQueryId}/UserByScreenName?`;
            const urlObj = new URL(urlBase);
            urlObj.searchParams.set("variables", JSON.stringify(variables));
            urlObj.searchParams.set("features", JSON.stringify(features));
            urlObj.searchParams.set("fieldToggles", JSON.stringify(fieldToggles));
            const url = urlObj.toString();

            const json = await API.apiRequest(url);
            verbose && console.log("[ujs][getUserInfo][json]", json);
            return json.data.user.result.legacy.entities.url?.urls[0].expanded_url;
        }
    }

    return API;
}

function getHistoryHelper() {
    function migrateLocalStore() {
        // 2023.07.05 // todo: uncomment after two+ months
        // Currently I disable it for cases if some browser's tabs uses the old version of the script.
        // const migrated = localStorage.getItem(StorageNames.migrated);
        // if (migrated === "true") {
        //     return;
        // }

        const newToOldNameMap = [
            [StorageNames.settings,                StorageNamesOld.settings],
            [StorageNames.settingsImageHistoryBy,  StorageNamesOld.settingsImageHistoryBy],
            [StorageNames.downloadedImageNames,    StorageNamesOld.downloadedImageNames],
            [StorageNames.downloadedImageTweetIds, StorageNamesOld.downloadedImageTweetIds],
            [StorageNames.downloadedVideoTweetIds, StorageNamesOld.downloadedVideoTweetIds],
        ];

        /**
         * @param {string} newName
         * @param {string} oldName
         * @param {string} value
         */
        function setValue(newName, oldName, value) {
            try {
                localStorage.setItem(newName, value);
            } catch (err) {
                localStorage.removeItem(oldName); // if there is no space ("exceeded the quota")
                localStorage.setItem(newName, value);
            }
            localStorage.removeItem(oldName);
        }

        function mergeOldWithNew({newName, oldName}) {
            const oldValueStr = localStorage.getItem(oldName);
            if (oldValueStr === null) {
                return;
            }
            const newValueStr = localStorage.getItem(newName);
            if (newValueStr === null) {
                setValue(newName, oldName, oldValueStr);
                return;
            }
            try {
                const oldValue = JSON.parse(oldValueStr);
                const newValue = JSON.parse(newValueStr);
                if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                    const resultArray = [...new Set([...newValue, ...oldValue])];
                    const resultArrayStr = JSON.stringify(resultArray);
                    setValue(newName, oldName, resultArrayStr);
                }
            } catch (err) {
                // return;
            }
        }

        for (const [newName, oldName] of newToOldNameMap) {
            mergeOldWithNew({newName, oldName});
        }
        // localStorage.setItem(StorageNames.migrated, "true");
    }

    function exportHistory(onDone) {
        const exportObject = [
            StorageNames.settings,
            StorageNames.settingsImageHistoryBy,
            StorageNames.downloadedImageNames,    // only if "settingsImageHistoryBy" === "IMAGE_NAME" (by default)
            StorageNames.downloadedImageTweetIds, // only if "settingsImageHistoryBy" === "TWEET_ID" (need to set manually with DevTools)
            StorageNames.downloadedVideoTweetIds,
        ].reduce((acc, name) => {
            const valueStr = localStorage.getItem(name);
            if (valueStr === null) {
                return acc;
            }
            let value = JSON.parse(valueStr);
            if (Array.isArray(value)) {
                value = [...new Set(value)];
            }
            acc[name] = value;
            return acc;
        }, {});
        const browserName = localStorage.getItem(StorageNames.browserName) || getBrowserName();
        const browserLine = browserName ? "-" + browserName : "";

        downloadBlob(new Blob([toLineJSON(exportObject, true)]), `ujs-twitter-click-n-save-export-${dateToDayDateString(new Date())}${browserLine}.json`);
        onDone();
    }

    function verify(jsonObject) {
        if (Array.isArray(jsonObject)) {
            throw new Error("Wrong object! JSON contains an array.");
        }
        if (Object.keys(jsonObject).some(key => !key.startsWith("ujs-twitter-click-n-save"))) {
            throw new Error("Wrong object! The keys should start with 'ujs-twitter-click-n-save'.");
        }
    }

    function importHistory(onDone, onError) {
        const importInput = document.createElement("input");
        importInput.type = "file";
        importInput.accept = "application/json";
        importInput.style.display = "none";
        document.body.prepend(importInput);
        importInput.addEventListener("change", async _event => {
            let json;
            try {
                json = JSON.parse(await importInput.files[0].text());
                verify(json);

                Object.entries(json).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value = [...new Set(value)];
                    }
                    localStorage.setItem(key, JSON.stringify(value));
                });
                onDone();
            } catch (err) {
                onError(err);
            } finally {
                await sleep(1000);
                importInput.remove();
            }
        });
        importInput.click();
    }

    function mergeHistory(onDone, onError) { // Only merges arrays
        const mergeInput = document.createElement("input");
        mergeInput.type = "file";
        mergeInput.accept = "application/json";
        mergeInput.style.display = "none";
        document.body.prepend(mergeInput);
        mergeInput.addEventListener("change", async _event => {
            let json;
            try {
                json = JSON.parse(await mergeInput.files[0].text());
                verify(json);
                Object.entries(json).forEach(([key, value]) => {
                    if (!Array.isArray(value)) {
                        return;
                    }
                    const existedValue = JSON.parse(localStorage.getItem(key));
                    if (Array.isArray(existedValue)) {
                        const resultValue = [...new Set([...existedValue, ...value])];
                        localStorage.setItem(key, JSON.stringify(resultValue));
                    } else {
                        localStorage.setItem(key, JSON.stringify(value));
                    }
                });
                onDone();
            } catch (err) {
                onError(err);
            } finally {
                await sleep(1000);
                mergeInput.remove();
            }
        });
        mergeInput.click();
    }

    return {exportHistory, importHistory, mergeHistory, migrateLocalStore};
}

// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
// --- Common Utils --- //

// --- LocalStorage util class --- //
function hoistLS(settings = {}) {
    const {
        verbose, // debug "messages" in the document.title
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

// --- Just groups them in a function for the convenient code looking --- //
function getUtils({verbose}) {
    function sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    async function fetchResource(url, onProgress = props => console.log(props)) {
        try {
            /** @type {Response} */
            let response = await fetch(url, {
                // cache: "force-cache",
            });
            const lastModifiedDateSeconds = response.headers.get("last-modified");
            const contentType = response.headers.get("content-type");

            const lastModifiedDate = dateToDayDateString(lastModifiedDateSeconds);
            const extension = contentType ? extensionFromMime(contentType) : null;

            if (onProgress) {
                response = responseProgressProxy(response, onProgress);
            }

            const blob = await response.blob();

            // https://pbs.twimg.com/media/AbcdEFgijKL01_9?format=jpg&name=orig                                     -> AbcdEFgijKL01_9
            // https://pbs.twimg.com/ext_tw_video_thumb/1234567890123456789/pu/img/Ab1cd2345EFgijKL.jpg?name=orig   -> Ab1cd2345EFgijKL.jpg
            // https://video.twimg.com/ext_tw_video/1234567890123456789/pu/vid/946x720/Ab1cd2345EFgijKL.mp4?tag=10  -> Ab1cd2345EFgijKL.mp4
            const _url = new URL(url);
            const {filename} = (_url.origin + _url.pathname).match(/(?<filename>[^\/]+$)/).groups;

            const {name} = filename.match(/(?<name>^[^.]+)/).groups;
            return {blob, lastModifiedDate, contentType, extension, name, status: response.status};
        } catch (error) {
            verbose && console.error("[ujs][fetchResource]", url);
            verbose && console.error("[ujs][fetchResource]", error);
            throw error;
        }
    }

    function extensionFromMime(mimeType) {
        let extension = mimeType.match(/(?<=\/).+/)[0];
        extension = extension === "jpeg" ? "jpg" : extension;
        return extension;
    }

    // the original download url will be posted as hash of the blob url, so you can check it in the download manager's history
    function downloadBlob(blob, name, url) {
        const anchor = document.createElement("a");
        anchor.setAttribute("download", name || "");
        const blobUrl = URL.createObjectURL(blob);
        anchor.href = blobUrl + (url ? ("#" + url) : "");
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
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
        verbose && console.log("[ujs][getCookie]", document.cookie);
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
        } catch (err) {
            // todo need investigate it
            console.error(err); // "The document has mutated since the result was returned."
            return [];
        }
    }

    const identityContentEncodings = new Set([null, "identity", "no encoding"]);
    function getOnProgressProps(response) {
        const {headers, status, statusText, url, redirected, ok} = response;
        const isIdentity = identityContentEncodings.has(headers.get("Content-Encoding"));
        const compressed = !isIdentity;
        const _contentLength = parseInt(headers.get("Content-Length")); // `get()` returns `null` if no header present
        const contentLength = isNaN(_contentLength) ? null : _contentLength;
        const lengthComputable = isIdentity && _contentLength !== null;

        // Original XHR behaviour; in TM it equals to `contentLength`, or `-1` if `contentLength` is `null` (and `0`?).
        const total = lengthComputable ? contentLength : 0;
        const gmTotal = contentLength > 0 ? contentLength : -1; // Like `total` is in TM and GM.

        return {
            gmTotal, total, lengthComputable,
            compressed, contentLength,
            headers, status, statusText, url, redirected, ok
        };
    }
    function responseProgressProxy(response, onProgress) {
        const onProgressProps = getOnProgressProps(response);
        let loaded = 0;
        const reader = response.body.getReader();
        const readableStream = new ReadableStream({
            async start(controller) {
                while (true) {
                    const {done, /** @type {Uint8Array} */ value} = await reader.read();
                    if (done) {
                        break;
                    }
                    loaded += value.length;
                    try {
                        onProgress({loaded, ...onProgressProps});
                    } catch (err) {
                        console.error("[ujs][onProgress]:", err);
                    }
                    controller.enqueue(value);
                }
                controller.close();
                reader.releaseLock();
            },
            cancel() {
                void reader.cancel();
            }
        });
        return new ResponseEx(readableStream, response);
    }
    class ResponseEx extends Response {
        [Symbol.toStringTag] = "ResponseEx";

        constructor(body, {headers, status, statusText, url, redirected, type, ok}) {
            super(body, {
                status, statusText, headers: {
                    ...headers,
                    "content-type": headers.get("content-type")?.split("; ")[0] // Fixes Blob type ("text/html; charset=UTF-8") in TM
                }
            });
            this._type = type;
            this._url = url;
            this._redirected = redirected;
            this._ok = ok;
            this._headers = headers; // `HeadersLike` is more user-friendly for debug than the original `Headers` object
        }
        get redirected() { return this._redirected; }
        get url() { return this._url; }
        get type() { return this._type || "basic"; }
        get ok() { return this._ok; }
        /** @returns {Headers} - `Headers`-like object */
        get headers() { return this._headers; }
    }

    function toLineJSON(object, prettyHead = false) {
        let result = "{\n";
        const entries = Object.entries(object);
        const length = entries.length;
        if (prettyHead && length > 0) {
            result += `"${entries[0][0]}":${JSON.stringify(entries[0][1], null, " ")}`;
            if (length > 1) {
                result += `,\n\n`;
            }
        }
        for (let i = 1; i < length - 1; i++) {
            result += `"${entries[i][0]}":${JSON.stringify(entries[i][1])},\n`;
        }
        if (length > 0 && !prettyHead || length > 1) {
            result += `"${entries[length - 1][0]}":${JSON.stringify(entries[length - 1][1])}`;
        }
        result += `\n}`;
        return result;
    }

    const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;

    function getBrowserName() {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return userAgent.indexOf("edge") > -1 ? "edge-legacy"
            : userAgent.indexOf("edg") > -1 ? "edge"
            : userAgent.indexOf("opr") > -1 && !!window.opr ? "opera"
            : userAgent.indexOf("chrome") > -1 && !!window.chrome ? "chrome"
            : userAgent.indexOf("firefox") > -1 ? "firefox"
            : userAgent.indexOf("safari") > -1 ? "safari"
            : "";
    }

    function removeSearchParams(url) {
        const urlObj = new URL(url);
        const keys = []; // FF + VM fix // Instead of [...urlObj.searchParams.keys()]
        urlObj.searchParams.forEach((v, k) => { keys.push(k); });
        for (const key of keys) {
            urlObj.searchParams.delete(key);
        }
        return urlObj.toString();
    }

    return {
        sleep, fetchResource, extensionFromMime, downloadBlob, dateToDayDateString,
        addCSS,
        getCookie,
        throttle, throttleWithResult,
        xpath, xpathAll,
        responseProgressProxy,
        toLineJSON,
        isFirefox,
        getBrowserName,
        removeSearchParams,
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
