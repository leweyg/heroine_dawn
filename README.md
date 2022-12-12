# Heroine Dawn
A single-quest fantasy-rpg in a hand-drawn first-person perspective.

World Guide: https://leweyg.github.io/heroine_dawn/

Play Game: https://leweyg.github.io/heroine_dawn/web/

Play Original: https://heroinedusk.com/ 

Original Git: https://github.com/clintbellanger/heroine-dusk 

![Heroine Dawn, screenshot](/heroine_dawn.png)

# Credits
Heroine Dawn was adapted by Lewey Geselowitz http://lewcid.com

Heroine Dusk was created by Clint Bellanger http://clintbellanger.net

3D Assets by Kay Lousberg https://kaylousberg.com/

3D Authored in the Lewcid/Three.js Editor https://leweyg.github.io/lewcid_editor/

Monochrome RPG assets by Kenney https://www.kenney.nl/assets/monochrome-rpg

Heroine Dusk features music by Yubatake http://opengameart.org/users/yubatake


# Why?
While doing research for an up-coming game, I came across the open source game
'Heroine Dusk' that had so many of the right components and really well organized content.
After initially trying to simply export the game data, I got more involved in the world
and eventually made this fairly complete remake of the original, with some additional
tunings such as:
- Controls with perspective adjust
- More dynamic UI/HUD system
- Time-based combat system (idle, open tell, strike)
- Nicer sales people in shops
- Content tunings, quest overview, etc.
- More data driven approach

I have called it 'Heroine Dawn'
only to distinguish it from the original, but it's super close at this point (and both are GPL v3). I somewhat carefully export all of the original data into a JSON file, and then
rebuilt the code from there.

# Data Structure
Open source was an important part of this project, and much of the effort went into creating
a JSON export of most parts of the original game. This description can be seen in raw form,
or as the "World Guide" which is really a light visualization of this same data:

Raw JSON: https://github.com/leweyg/heroine_dawn/blob/main/web/world.json

World Guide: https://leweyg.github.io/heroine_dawn/

Game based on JSON: https://github.com/leweyg/heroine_dawn/tree/main/web 

# Future
Anyone is welcome to fork/branch/whatever if this interests them:
- Restore sounds and music (I usually code silently)
- Rebuild the game in real-time 3D
- Use directional swipes in battle
- Ultimatly replace combat with 'healer' gameplay and story line (the original idea)