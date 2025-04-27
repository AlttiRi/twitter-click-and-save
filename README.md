# [Twitter Click'n'Save](https://github.com/AlttiRi/twitter-click-and-save#twitter-clicknsave)

This userscript allows you to save media content (images, videos) from Twitter's tweets by just a click on a button which appears over the media in tweets.

The content saves (downloads) with the most appropriate filename. The userscript also keeps the download history, so you will not download some media twice if you do not want it.

## Additional enhancements
- Makes links direct in tweets and in the browser title
- Highlight visited links
- Automatically expands spoilers
- Hides: sign up bar, sign up section; trends; topics to follow

## Installation

_An installed userscript manager browser extension is required._*

To install just do two clicks:

1. **[Click on this link](https://greasyfork.org/scripts/430132-twitter-click-n-save/code/Twitter%20Click'n'Save.user.js)** _(to install it from [greasyfork](https://greasyfork.org/en/scripts/430132))_
2. Confirm the installation in your userscript manager.

_*For example: Tampermonkey
[![Chrome image by Google](https://github.com/user-attachments/assets/08515d91-3f98-42c4-a8d8-100118724898 "Download Tampermonkey for a Chromium based browser")](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
[![Firefox image by Mozilla Foundation](https://github.com/user-attachments/assets/b7292c1c-dc7b-44ab-a159-0935991c503f "Download Tampermonkey for Firefox")](https://addons.mozilla.org/firefox/addon/tampermonkey/),
Violentmonkey
[![Chrome image by Google](https://github.com/user-attachments/assets/08515d91-3f98-42c4-a8d8-100118724898 "Download Violentmonkey for a Chromium based browser")](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
[![Firefox image by Mozilla Foundation](https://github.com/user-attachments/assets/b7292c1c-dc7b-44ab-a159-0935991c503f "Download Violentmonkey for Firefox")](https://addons.mozilla.org/firefox/addon/violentmonkey/),
Greasemonkey
[![Firefox image by Mozilla Foundation](https://github.com/user-attachments/assets/b7292c1c-dc7b-44ab-a159-0935991c503f "Download Greasemonkey for Firefox")](https://addons.mozilla.org/firefox/addon/greasemonkey/)._

---

## Let's look

![https://twitter.com/SpaceX/status/1418667693016711170](https://user-images.githubusercontent.com/16310547/126910424-497886d1-527c-493a-9a17-3e832b48ce05.png "https://twitter.com/SpaceX/status/1418667693016711170")

It adds a colored download button to the left upper corner of a media. It appears only when you hover mouse pointer over the tweet.
The red button means you did not save this image (or video), green — you have downloaded it right now, blue — the media is already saved.

_Note: the green button does not disapper after the mouse leave the tweet in order to easier counting that you have downloaded right now._

## Filename format

I sure this userscript saves files with **the best filename**.

The filename pattern looks so: `[twitter] {author}—{YYYY.MM.DD}—{id}—{filename}.{extension}`.

The examples:
- [twitter] SpaceX—2020.05.04—1257328055816601600—EXLtL49UYAA7vCG.jpg
- [twitter] SpaceX—2021.03.30—1376902938635870209—Exu93-nU8AAMAiC.jpg
- [twitter] SpaceX—2021.07.20—1417288642662338564—E6s4ZjGUUAEInfM.jpg
- [twitter] SpaceX—2021.07.23—1418667693016711170—E7AdwdkUYAAqxy3.jpg
- [twitter] SpaceX—2021.09.16—1438552431021932551—E_bDyKvXMAAm4RV.jpg
- [twitter] SpaceX—2021.09.16—1438552431021932551—E_bDyKvX0AQbi17.jpg

**It's the perfect filename.**

Why? Because it resolves the problem of file organization and includes a lot of useful information!

With this filename the downloaded **files are already organized**:
with the default sorting by name (in a file explorer) the files will grouped by site, by user, by date and ordered by date and tweet ID.
It's not a problem if the files are located in the different folders.
Just perform the search by `[twitter]` in a root folder to list all files which you have download with this userscript. Again, they will be grouped and sorted only due to name sorting. That's extremely useful thing!

You can easily find some media from the selected user in you local files (the media's **author is credited** in the filename), know when it was posted, and go to the tweet by pasting the tweet `ID` to `https://twitter.com/_/status/{ID}`. The "default" filename (for example, `EXLtL49UYAA7vCG.jpg`) is for "compatibility". For example, if someone shared with you a file with `E7AdwdkUYAAqxy3.jpg` filename you can check did you downloaded it just by the search in your local files.

The date format is `YYYY.MM.DD`. It's the only one proper format. It's unambiguous format. And it can be properly ordered by the sorting by name. The important detail is it's UTC date. So the same file downloaded by people in different time zones will have the same filename.

`[twitter]`, not just `twitter`? The first character as a special character (not `a-zA-Z0-9`) separates the downloaded files with the userscript from other files with "usual" names. And it looks nice, like a common tag.

Finally, "**—**" character. Probably, it's the best character for separating purpose. It just **one** character _(UTF-16)_, you do not need to add extra spaces around it to make it looks good. It's a rarely used character, that makes parsing easier.


_[@see `gallery-dl` config ↓](#gallery-dl-config)_

## Addition enhancements (more details)

While the main purpose of the userscript is to be **Twitter image and video downloader** it also does some useful things:

### Direct links: in tweets, in title and `a:visited`

![image](https://user-images.githubusercontent.com/16310547/126907767-49141217-7c43-470e-b5ea-ad0cdc6979fe.png)

Twitter replaces all outer links in tweets with redirect links like it: https://t.co/0MLMmDhZRx?amp=1 (https://example.com).

The userscript transforms redirect links to the original links.

While [Twitter says that it's used for protection](https://developer.twitter.com/en/docs/tco), but it's mostly used for the analytic purpose.

With the direct link you immediately see where it to goes (in the browser bottom corner), also you can copy exactly it with a context menu.

In additional to it the userscript enables highlight of `:visited` links with `darkorange` color. So you can see did you visit the link before or not. (Note: it's based on the browser history which keeps visits within 3 months).

The more useful feature is that it also adds to `t.co` links in the title the original links.

For example, the default title:

`Username on Twitter: "A test tweet. https://t.co/0MLMmDhZRx" / Twitter`

transforms to

`Username: "A test tweet. https://example.com/ (https://t.co/0MLMmDhZRx)"`

It's very useful if you bookmark tweets. You can find the bookmarked tweet by searching of the site's name that was posted in the tweet, since the title is used as a bookmark's description.

_And yes, I did not forget to add `rel="nofollow noopener noreferrer"` to the direct links (If you know what it is)._


### Automatic spoiler expanding

![Profile and Media Spoiler](https://user-images.githubusercontent.com/16310547/126909041-ad6cb522-a44f-49b6-992d-873bbd77ae8e.png)


If you have no Twitter account, and you visit a profile or watch tweets with media that were marked as "may include potentially sensitive content" it's starting to be a pain to expand spoilers by a click on "View" button each damning time.

This userscript does it automatically, instantly.


### Unnecessary content hiding: sign up bar/section; trends; topics to follow

![Screenshot](https://user-images.githubusercontent.com/16310547/126911788-1cf9ec76-a415-49d2-9428-4f8a7ae1ca7d.png)

It hides the sign-up bar and the sign-up section which shows all time while you are not logged in.

_(Note: of course, you are able to log in/sing up in [the front page](https://twitter.com/) or in the pop-up that appears after you click on some button ("Like", "Follow"))_

![Screenshot](https://user-images.githubusercontent.com/16310547/126912048-5efa30be-db76-4b7e-bd4a-7dc9d0dddb11.png)

Finally, it hides "Trends" and "Topic to follow" by default. I find them useless, but you can do not agree with me, so it's not a big problem to disable this option. Just comment three related lines in the code in `Features to execute` section.

UPD. Hiding of the Sign Up bottom bar also hides "Messages" block. In additional, the hiding the bottom bar can disable autoplaying videos that can be useful. You need to set `doNotPlayVideosAutomatically` to `true` for that.

![Messages](https://user-images.githubusercontent.com/16310547/133233108-807bdca2-7fb0-4324-b98c-bbadbd008d55.png)


---

## Gallery-dl config
This userscript is suited for single media downloading. If you want to download a balk of media, use [gallery-dl](https://github.com/mikf/gallery-dl).

To have [the same filenames ↑](#filename-format) use the follow config:
```json
"twitter": {
    "directory": ["[gallery-dl]", "[{category}] {author[name]}"],
    "filename": "[{category}] {author[name]}—{date:%Y.%m.%d}—{retweet_id|tweet_id}—{filename}.{extension}",
    "retweets": "original",
    "videos": true
}
```

Update: Since March 2022 Twitter now requires an account to watch NSFW content, so you need to use in gallery-dl **either** `"auth_token"` cookie from the browser where you are logged in, **or** `"username"` and `"password"`. (It's optionally, if you are going to download NSFW content.)
```json
    "cookies": {
        "auth_token": "ABCDEF"
    }
```
Only replace the example `"auth_token"`'s value with yours, or use `"username"` and `"password"` instead:
```json
    "username": "admin",
    "password": "123"
```


The entire config file will look, for example, so:

```json
{
    "extractor": {
        "base-directory": "./",
        "...": "...",
        "...": "...",
        "reddit": {
            "...": "..."
        },

        "twitter": {
            "directory": ["[gallery-dl]", "[{category}] {author[name]}"],
            "filename": "[{category}] {author[name]}—{date:%Y.%m.%d}—{retweet_id|tweet_id}—{filename}.{extension}",
            "retweets": "original",
            "videos": true,
            "cookies": {
                "auth_token": ""
            }
        },

        "tumblr": {
            "...": "...",
            "...": "..."
        }
    }
}
```
(Just replace the default settings for [`"twitter"`](https://github.com/mikf/gallery-dl/blob/5eca3781be862e80d871bd6e51fc26e1ff73f0db/docs/gallery-dl.conf#L255-L268) in your [`%HOMEPATH%/gallery-dl.conf`](https://github.com/mikf/gallery-dl/blob/master/docs/gallery-dl.conf) config file.)

_Do not forget to add a comma (`,`) if you put this in the middle of the json file._

To download `someone`'s media use (`/media` endpoint):
- `gallery-dl https://twitter.com/someone/media`

If `someone`'s has a lot of posts (more than 1000) use a search result downloading:
- `gallery-dl "https://twitter.com/search?q=from:someone"`

---

### Additional notes
1. Some features are language dependent. Currently, the script works fully with `"en"`, `"es"`, `"ru"`, `"zh"`, `"ja"`. See `getLanguageConstants` function. You can add `?lang=en` in the address bar to temporary change your language to check the work of the script.

2. The script uses `LocalStorage` to keep the download history.

3. If you see the `[warning] Original images are not available.` warning on the button:

   ![image](https://user-images.githubusercontent.com/16310547/226091371-81fb07bf-8bc8-45df-a619-b90deb1ecf4d.png)

   it means that the original image `orig`, or `4096x4096` is not available.

   Possible reasons: the tweet containing the image was deleted, or some site issue (possibly, temporal — in this case try to download the image later).



### Recommendations
- Use [uBlock Origin](https://github.com/gorhill/uBlock) web extension for an advertisement blocking.
- For bulk download use [gallery-dl](https://github.com/mikf/gallery-dl) console program as mentioned [above](#gallery-dl-config).
- In Firefox, I recommend to disable `browser.download.alwaysOpenPanel` in `about:config` in order to the download popup does not open each download.


### If the script does not work

The userscript may do not work if you have set `"Enhanced Tracking Protection"` to `"Strict"` in Firefox (`"Tracking content"` option of the "Custom" preset) in `about:preferences#privacy`. Try to enable `"Strict Tracking Protection Fix"` in the userscript settings popup.
