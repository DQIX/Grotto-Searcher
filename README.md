# DQ9 Grotto Searcher
A powerful Grotto search tool created by using Claude and Gemini.

Based on reverse-engineered database, dq9tmap101.exe's ElistOfs logic, and some edge cases fixed by TKG and Claude.

Improvements from legacy DQ9 Grotto search tools
- Fixed misjudgments (such as misjudging Single Monster Floor into No-enemy Floor, etc.) by fixing ElistOfs logic by TKG
- Fundamentally fixed Softlock (危険？ハマる地図 in Japanese, floor Seed 0x5BC7)'s wrong display of stairs & chests by referring Yab's DQ9 Tool's result then fixing reverse-engineered database by Claude
- Deciphered Multibug phenomenon and implemented Multibug special floor searching by Claude and Gemini

For details, please see help documents & Disclaimer inside the tool.

# Available Search Functions

Overall
- You can manually type "?id=RRSSSS" to specify a map
- For example: https://dqix.github.io/Grotto-Searcher/?id=797854 for jumping to Silver Marsh of Bane Lv.58

Ultimate search
- Grotto Name, Level
- Terrain Type, SMR (B1 Monster Rank), Depth, Boss
- Location, Base Quality
- Chest amount in each Chest rank
- Wandering Monster bugged floor status (ElistOfs)
- Single monster floor (Only)
- Nipple Map (inaccessible chest), Chamber Map (inaccessible area), Softlock, Fastest Map Search, etc.
- 4-player Multiplay Bug (Multibug)
- CPU Benchmark (💻)

Chest Timer related search
- Quickload B3/B4/B9 same item x2 (QL)
- Quickload + 3rd Chest same item (Combo)
- 3rd Chest same item x2 (3rd)
- (New!) Dropdown List: PPAP(5s,9s) & Fast Quickload/PPAP Map Search support
- Chest free search (up to 3 chests)
- Chest Timer Marathon Tool (support both Japanese and English)

Map Method (AT) search
- AT search (1) List all map Seeds of selected item drop pattern
- AT search (2) List all map Seeds for specific Whistle-summoned monster
- AT search (Detail) Enter map Seed to check details, Map Method Skill Combo Solver for Battle (WIP)

# In-tool Documents

Ultimate Search
- Grotto mechanics

Chest Timer Search
- Basic knowledge of Chest Timer, Quickload and PPAP

Map Method (AT) Search
- Map Method mechanics

All other languages are AI translated from Traditional Chinese version and manually fixed by the tool author (WIP).

# Requirements

iOS 10.3+ / Android 6.0+ / Windows 7+ / Any other OS which can run:

Chrome 57+ / Firefox 52+ / Edge 17+ / Safari 10.1+

Classic Web Worker is available online.

Locally running source code / standalone versions only support single thread.

CPU Benchmark (2026.06.30 renewal)
- iPhone 12 Pro Max: 20.48s
- iPhone 16 Pro: 11.22s
- i5-5200U: 37.15s
- i9-12900KF: 3.34s
- R9-9950X3D: 1.98s
