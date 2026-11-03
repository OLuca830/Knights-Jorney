PIXEL KNIGHT QUEST - habit game (retro knight, pixel princess, castle)

HOW TO TURN THIS INTO AN APK AND PUT IT ON YOUR PHONE
(no coding needed, you only use the GitHub website)

1. Unzip. You get ONE folder: pixel-knight-quest
2. Go to github.com > New repository > name it pixel-knight-quest > Create.
   (Already made it? Just upload these files again and choose
   "Commit changes". They replace the old ones and rebuild the APK.)
3. Click "uploading an existing file".
4. Open the unzipped folder and select EVERYTHING inside it
   (App.js, app.json, package.json, .gitignore, README.txt and the
   ".github" folder) and drag it all into the GitHub page.
   - ".github" starts with a dot, so it can be hidden:
     Windows: File Explorer > View > Show > Hidden items
     Mac: press Cmd + Shift + . in Finder
5. Click "Commit changes".
6. Click the "Actions" tab. A build called "Build Android APK" starts by itself.
   Wait about 15-25 minutes for the green check mark.
7. Click the finished build > scroll down to "Artifacts" >
   download "app-release-apk" (a zip) > unzip it > you get app-release.apk
8. Send app-release.apk to your phone (USB, Google Drive, email, or download
   it from the same GitHub page in your phone browser).
9. Tap it > allow "Install unknown apps" if asked > Install.
   If you already have an older version installed, uninstall it first.

WHAT IS IN THE APP
- Survey: role, age, wake/sleep, WHEN YOU ARE BUSY on each day of the week,
  goals and distractions. Quests are placed automatically in your free time
  each day, and your daily focus goal follows how much free time you have.
- Quests, focus timer (1 minute = 1 XP), Knight's Notes + bonfire, castle shop.
- SHIELD tab:
  * Safe DNS setup that blocks 18+ sites in every app (set in Android settings)
  * Shield Browser: blocks 18+ sites, makes you wait 10 minutes, then asks
    "Are you sure?". Yes = continue.
  * Guide to Play Store parental controls and Digital Wellbeing app timers
    for blocking 18+ / addictive apps (this app cannot close other apps itself)
  * Scroll Watch: after 15 minutes the Princess suggests things to do,
    chosen from your survey answers. Allow notifications when asked.

IF THE BUILD SHOWS A RED X
Open the failed build, click the red step, copy the last 30 lines and send
them to Claude. It will tell you the fix.

NOTES
- All features are free. No ads, no paywalls.
- Data is stored only on your phone.
- The APK is signed with a debug key, which is fine for installing on your own phone.
