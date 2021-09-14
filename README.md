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

1. **[Click on this link](https://greasyfork.org/scripts/430132-twitter-click-n-save/code/Twitter%20Click'n'Save.user.js)** _(to install from [greasyfork](https://greasyfork.org/en/scripts/430132))_
2. Confirm the installation in your usersript manager.

_*For example: Tampermonkey
[![Chrome image by Google](https://camo.githubusercontent.com/bae47ea3643e2620e4cb40abcb8a9889d4f8c2719232de1e0bd185da0d55a466/68747470733a2f2f69636f6e732e69636f6e617263686976652e636f6d2f69636f6e732f676f6f676c652f6368726f6d652f32342f476f6f676c652d4368726f6d652d69636f6e2e706e67 "Download Tampermonkey for a Chromium based browser")](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
[![Firefox image by Mozilla Foundation](https://camo.githubusercontent.com/4bd792755387276114a3bb4c063c99c0efa29fdca0da7be0638ca9fc9fb0ec59/68747470733a2f2f69636f6e732e69636f6e617263686976652e636f6d2f69636f6e732f6361726c6f736a6a2f6d6f7a696c6c612f32342f46697265666f782d69636f6e2e706e67 "Download Tampermonkey for Firefox")](https://addons.mozilla.org/firefox/addon/tampermonkey/),
Violentmonkey
[![Chrome image by Google](https://camo.githubusercontent.com/bae47ea3643e2620e4cb40abcb8a9889d4f8c2719232de1e0bd185da0d55a466/68747470733a2f2f69636f6e732e69636f6e617263686976652e636f6d2f69636f6e732f676f6f676c652f6368726f6d652f32342f476f6f676c652d4368726f6d652d69636f6e2e706e67 "Download Violentmonkey for a Chromium based browser")](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
[![Firefox image by Mozilla Foundation](https://camo.githubusercontent.com/4bd792755387276114a3bb4c063c99c0efa29fdca0da7be0638ca9fc9fb0ec59/68747470733a2f2f69636f6e732e69636f6e617263686976652e636f6d2f69636f6e732f6361726c6f736a6a2f6d6f7a696c6c612f32342f46697265666f782d69636f6e2e706e67 "Download Violentmonkey for Firefox")](https://addons.mozilla.org/firefox/addon/violentmonkey/), 
Greasemonkey
[![Firefox image by Mozilla Foundation](https://camo.githubusercontent.com/4bd792755387276114a3bb4c063c99c0efa29fdca0da7be0638ca9fc9fb0ec59/68747470733a2f2f69636f6e732e69636f6e617263686976652e636f6d2f69636f6e732f6361726c6f736a6a2f6d6f7a696c6c612f32342f46697265666f782d69636f6e2e706e67 "Download Greasemonkey for Firefox")](https://addons.mozilla.org/firefox/addon/greasemonkey/)._

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

It's the perfect filename.

Why? Because it resolves the problem of file organization and includes a lot of useful information!

With this filename the downloaded **files are already orginazed**: 
with the default sorting by name (in a file explorer) the files will grouped by site, by user, by date and ordered by date and tweet ID.
It's not a problem if the files are located in the differet folders. 
Just perform the seatch by `[twitter]` in a root folder to list all files which you have download with this userscript. Again, they will be grouped and sorted only due to name sorting. That's extremely useful thing!

You can easily find some media from the selected user in you local files (the media's **author is credited** in the filename), know when it was posted, and go to the tweet by pasting the tweet `ID` to `https://twitter.com/_/status/{ID}`. The "default" filename (for example, `EXLtL49UYAA7vCG.jpg`) is for "compatibility". For example, if someone shared with you a file with `E7AdwdkUYAAqxy3.jpg` filename you can check did you downloaded it just by the search in your local files.

The date format is `YYYY.MM.DD`. It's the only one proper format. It's unambiguous format. And it can be properly ordered by the sorting by name. The importans detail is it's UTC date. So the same file downloaded by people in different time zones will have the same filename.

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

With the direct link you immitiatly see where it to goes (in the browser bottom corner), also you can copy exactly it with a context menu.

In addtional to it the userscript enables highlight of `:visited` links with `darkorange` color. So you can see did you visit the link before or not. (Note: it's based on the browser history which keeps visits within 3 months).

The more useful feature is that it also adds to `t.co` links in the title the original links.

For example, the default title: 

`Username on Twitter: "A test tweet. https://t.co/0MLMmDhZRx" / Twitter` 

transforms to

`Username: "A test tweet. https://example.com/ (https://t.co/0MLMmDhZRx)"`

It's very useful if you bookmark tweets. You can find the bookmarked tweet by searching of the site's name that was posted in the tweet, since the title is used as a bookmark's description.

_And yes, I did not forget to add `rel="nofollow noopener noreferrer"` to the direct links (If you know what it is)._


### Automatic spoiler expanding

![Profile and Media Spoiler](https://user-images.githubusercontent.com/16310547/126909041-ad6cb522-a44f-49b6-992d-873bbd77ae8e.png)


If you have no Twitter account and you visit a profile or watch tweets with media that were marked as "may include potentially sensitive content" it's starting to be a pain to expand spoilers by a click on "View" button each damning time.

This userscript does it automatically, instantly.


### Unnecessary content hiding: sign up bar/section; trends; topics to follow

![Screenshot](https://user-images.githubusercontent.com/16310547/126911788-1cf9ec76-a415-49d2-9428-4f8a7ae1ca7d.png)

It hides the sign up bar and the sign up section which shows all time while you are not logged in.

_(Note: of course, you able to log in/sing up in [the front page](https://twitter.com/) or in the pop up that appers after you click on some button ("Like", "Follow"))_

![Screenshot](https://user-images.githubusercontent.com/16310547/126912048-5efa30be-db76-4b7e-bd4a-7dc9d0dddb11.png)

Finally, it hides "Trends" and "Topic to follow" by default. I find them useless, but you can do not agree with me, so it's not a big problem to disable this option. Just comment three related lines in the code in `Features to execute` section.

UPD. Hiding of the Sign Up bottom bar also hides "Messages" block. In additional, the hiding the bottom bar can disable auto playing videos that can be usefull. You need to set `doNotPlayVideosAutomatically` to `true` for that.

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

Replace with it the default settings for [`"twitter"`](https://github.com/mikf/gallery-dl/blob/5eca3781be862e80d871bd6e51fc26e1ff73f0db/docs/gallery-dl.conf#L255-L268) in your [`%HOMEPATH%/gallery-dl.conf`](https://github.com/mikf/gallery-dl/blob/master/docs/gallery-dl.conf) config file, so it will look so:
  
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
            "videos": true
        },

        "tumblr": {
            "...": "...",
            "...": "..."
        }
    }
}
```
_Do not forget to add a comma (`,`) if you put this in the middle of the json file._


---

### Additional notes
1. Some features are language dependent. Currently the script works fully with `"en"`, `"es"`, `"ru"`, `"zh"`. See `getLanguageConstants` function. You can add `?lang=en` in the address bar to temporary change your language to check the work of the script.

2. The script uses `LocalStorage` to keep the download history.
