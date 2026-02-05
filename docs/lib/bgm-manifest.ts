/**
 * BGM Configuration
 * This file contains metadata for all BGM tracks used in the game
 */

export interface BGMTrack {
  id: string
  name: string
  scene: string
  artist?: string
  source?: string
  loop: boolean
  volume: number
}

export const BGM_TRACKS: Record<string, BGMTrack> = {
  splash: {
    id: "splash",
    name: "Splash Screen BGM",
    scene: "splash",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: false,
    volume: 0.3,
  },
  home: {
    id: "home",
    name: "Home Screen BGM",
    scene: "home",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.3,
  },
  gacha: {
    id: "gacha",
    name: "Gacha BGM",
    scene: "gacha",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.25,
  },
  collection: {
    id: "collection",
    name: "Collection BGM",
    scene: "collection",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.3,
  },
  ranking: {
    id: "ranking",
    name: "Ranking Screen BGM",
    scene: "ranking",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.3,
  },
  training: {
    id: "training",
    name: "Training BGM",
    scene: "training",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.3,
  },
  matchmaking: {
    id: "matchmaking",
    name: "Matchmaking BGM",
    scene: "matchmaking",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.3,
  },
  battle: {
    id: "battle",
    name: "Battle BGM",
    scene: "battle",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.35,
  },
  "battle-royale": {
    id: "battle-royale",
    name: "Battle Royale BGM",
    scene: "battle-royale",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.35,
  },
  "team-royale": {
    id: "team-royale",
    name: "Team Royale BGM",
    scene: "team-royale",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.35,
  },
  profile: {
    id: "profile",
    name: "Profile BGM",
    scene: "profile",
    artist: "Free BGM",
    source: "Pixabay Music",
    loop: true,
    volume: 0.3,
  },
}

/**
 * BGMソースのおすすめ
 * - Pixabay Music: https://pixabay.com/music/
 * - Zapsplat: https://www.zapsplat.com/
 * - Incompetech: https://www.incompetech.com/
 * - OpenGameArt: https://opengameart.org/
 */
