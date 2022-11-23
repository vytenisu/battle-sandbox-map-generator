import {times} from './utils/loops'
import {IPosition} from './types/common'
import {BODY_PART_MAX_HITS, CREEP_LIFE_TIME} from './constants/screeps'
import {IFeed, IRoom, ITerrainMap} from './types/feed'
import {EObjectType, IObject, ITerrainMask} from './types/simplified-screeps'
import {Position} from './utils/position'
import {Random} from './utils/random'
import {getCreepByPosition, getMyCreeps, isWall} from './utils/map'

export interface IRoomGenerationProps {
  room: IRoom
  terrain: ITerrainGenerationProps
  creeps: ICreepGenerationProps
}

export interface ITerrainGenerationProps {
  initialWallMinAmount: number
  initialWallMaxAmount: number
  initialSwampMinAmount: number
  initialSwampMaxAmount: number
  growWallMinAmount: number
  growWallMaxAmount: number
  growSwampMinAmount: number
  growSwampMaxAmount: number
}

export interface ICreepGenerationProps {
  ownMinAmount: number
  ownMaxAmount: number
  enemyMinAmount: number
  enemyMaxAmount: number
}

export const generateRoom = ({
  room,
  creeps: {ownMinAmount, ownMaxAmount, enemyMinAmount, enemyMaxAmount},
  terrain: {
    initialWallMinAmount,
    initialWallMaxAmount,
    initialSwampMinAmount,
    initialSwampMaxAmount,
    growWallMinAmount,
    growWallMaxAmount,
    growSwampMinAmount,
    growSwampMaxAmount,
  },
}: IRoomGenerationProps) => {
  const ownCreepAmount = Random.getInteger(ownMinAmount, ownMaxAmount)
  const enemyCreepAmount = Random.getInteger(enemyMinAmount, enemyMaxAmount)

  const terrain = generateTerrain(
    initialWallMinAmount,
    initialWallMaxAmount,
    initialSwampMinAmount,
    initialSwampMaxAmount,
    growWallMinAmount,
    growWallMaxAmount,
    growSwampMinAmount,
    growSwampMaxAmount,
    room,
    [],
    {},
  )

  const objects = generateCreeps(
    ownCreepAmount,
    enemyCreepAmount,
    [],
    room,
    terrain,
  )

  return {room, objects, terrain}
}

const generateTerrain = (
  initialWallAmountMin: number,
  initialWallAmountMax: number,
  initialSwampAmountMin: number,
  initialSwampAmountMax: number,
  growWallMin: number,
  growWallMax: number,
  growSwampMin: number,
  growSwampMax: number,
  room: IRoom,
  objects: IObject[],
  terrain: ITerrainMap,
) => {
  let result = terrain

  result = generateInitialTerrain(
    Math.ceil(initialWallAmountMin),
    Math.ceil(initialWallAmountMax),
    room,
    objects,
    result,
    TERRAIN_MASK_WALL,
  )

  result = growTerrain(
    growWallMin,
    growWallMax,
    TERRAIN_MASK_WALL,
    room,
    objects,
    result,
  )

  result = generateInitialTerrain(
    Math.ceil(initialSwampAmountMin),
    Math.ceil(initialSwampAmountMax),
    room,
    objects,
    result,
    TERRAIN_MASK_SWAMP,
  )

  result = growTerrain(
    growSwampMin,
    growSwampMax,
    TERRAIN_MASK_SWAMP,
    room,
    objects,
    result,
  )

  return result
}

const generateCreeps = (
  ownAmount: number,
  enemyAmount: number,
  objects: IObject[],
  room: IRoom,
  terrain: ITerrainMap,
): IObject[] => {
  let result = objects

  times(ownAmount, i => {
    result = generateCreep(`cm${i}`, true, room, result, terrain, false)
  })

  times(enemyAmount, i => {
    // TODO: make nearby creep behavior configurable
    result = generateCreep(`cr${i}`, false, room, result, terrain, i === 0)
  })

  return result
}

const generateInitialTerrain = (
  minAmount: number,
  maxAmount: number,
  room: IRoom,
  objects: IObject[],
  terrain: ITerrainMap,
  terrainMask: ITerrainMask,
) => {
  const amount = Random.getInteger(minAmount, maxAmount)

  let result = terrain

  times(amount, () => {
    result = generateInitialTerrainItem(room, objects, result, terrainMask)
  })

  return result
}

const generateInitialTerrainItem = (
  room: IRoom,
  objects: IObject[],
  terrain: ITerrainMap,
  terrainMask: ITerrainMask,
): ITerrainMap => {
  let availablePositions = getAvailablePositions(room, objects, terrain)

  const nearWallPositions = availablePositions.filter(
    ({x, y}) =>
      x === 0 || x === room.width - 1 || y === 0 || y === room.height - 1,
  )

  availablePositions = [
    ...availablePositions,
    ...nearWallPositions,
    ...nearWallPositions,
    ...nearWallPositions,
    ...nearWallPositions,
    ...nearWallPositions,
    ...nearWallPositions,
    ...nearWallPositions,
  ]

  const pos = getRandomPosition(room, objects, terrain)

  return addTerrainItem(pos, terrainMask, terrain)
}

const addTerrainItem = (
  pos: IPosition,
  terrainMask: ITerrainMask,
  terrain: ITerrainMap,
): ITerrainMap => ({
  ...terrain,
  [Position.hash(pos)]: {
    terrain: terrainMask,
  },
})

const growTerrain = (
  minAmount: number,
  maxAmount: number,
  terrainMask: ITerrainMask,
  room: IRoom,
  objects: IObject[],
  terrain: ITerrainMap,
): ITerrainMap => {
  const amount = Random.getInteger(minAmount, maxAmount)

  let result = terrain

  times(amount, () => {
    const grownTerrain = addGrownTerrainItem(result, terrainMask, objects, room)

    if (grownTerrain) {
      result = grownTerrain
    } else {
      return false
    }
  })

  return result
}

const addGrownTerrainItem = (
  terrain: ITerrainMap,
  terrainMask: ITerrainMask,
  objects: IObject[],
  room: IRoom,
) => {
  let posInfo = getAvailablePositions(room, objects, terrain).map(pos => ({
    pos,
    amount: getTerrainConnectionAmount(pos, terrainMask, terrain, room),
  }))

  const availablePosInfo1x = posInfo.filter(({amount}) => amount)
  const availablePosInfo2x = availablePosInfo1x.filter(({amount}) => amount > 1)
  const availablePosInfo3x = availablePosInfo2x.filter(({amount}) => amount > 2)
  const availablePosInfo4x = availablePosInfo3x.filter(({amount}) => amount > 3)

  let availablePositions = availablePosInfo1x.map(({pos}) => pos)
  let availablePositions2x = availablePosInfo2x.map(({pos}) => pos)
  let availablePositions3x = availablePosInfo3x.map(({pos}) => pos)
  let availablePositions4x = availablePosInfo4x.map(({pos}) => pos)

  availablePositions = availablePositions4x.length
    ? availablePositions4x
    : availablePositions3x.length
    ? availablePositions3x
    : [
        ...availablePositions,
        ...availablePositions2x,
        ...availablePositions2x,
        ...availablePositions2x,
        ...availablePositions2x,
        ...availablePositions2x,
      ]

  const pos = Random.getArrayItem(availablePositions)

  if (pos) {
    return addTerrainItem(pos, terrainMask, terrain)
  } else {
    return null
  }
}

const getTerrainConnectionAmount = (
  pos: IPosition,
  terrainMask: ITerrainMask,
  terrain: ITerrainMap,
  room: IRoom,
): Number => {
  let amount = 0

  if (
    terrain[Position.hash({x: pos.x + 1, y: pos.y})]?.terrain === terrainMask
  ) {
    amount++
  } else if (pos.x >= room.width) {
    amount++
  }

  if (
    terrain[Position.hash({x: pos.x - 1, y: pos.y})]?.terrain === terrainMask
  ) {
    amount++
  } else if (pos.x < 0) {
    amount++
  }

  if (
    terrain[Position.hash({x: pos.x, y: pos.y + 1})]?.terrain === terrainMask
  ) {
    amount++
  } else if (pos.y >= room.height) {
    amount++
  }

  if (
    terrain[Position.hash({x: pos.x, y: pos.y - 1})]?.terrain === terrainMask
  ) {
    amount++
  } else if (pos.y < 0) {
    amount++
  }

  return amount
}

const generateCreep = (
  id: string,
  my: boolean,
  room: IRoom,
  objects: IObject[],
  terrain: ITerrainMap,
  nearMyCreep: boolean,
): IObject[] => {
  let pos: IPosition

  if (!nearMyCreep) {
    pos = getRandomPosition(room, objects, terrain, true)
  } else {
    const myCreeps = getMyCreeps({objects} as IFeed)

    const nearPositions = myCreeps
      .flatMap(creep => Position.getNearPositions(creep.pos, room))
      .filter(pos => !getCreepByPosition(pos, {objects} as IFeed))
      .filter(pos => !isWall(pos, {terrain} as IFeed))

    if (nearPositions.length) {
      pos = Random.getArrayItem(nearPositions)
    } else {
      pos = getRandomPosition(room, objects, terrain, true)
    }
  }

  const body: BodyPartDefinition[] = []

  const availableBodyParts: BodyPartDefinition[] = [
    {type: MOVE, hits: BODY_PART_MAX_HITS},
    {type: ATTACK, hits: BODY_PART_MAX_HITS},
  ]

  const bodyPartAmount = Random.getInteger(1, 50)

  for (let i = 0; i < bodyPartAmount; i++) {
    const randomBodyPart = Random.getArrayItem(
      availableBodyParts,
    ) as BodyPartDefinition
    body.push(randomBodyPart)
  }

  const isAlive = body.find(({hits}) => hits)

  if (!isAlive) {
    body[body.length - 1].hits = 1
  }

  const hitsMax = body.length * BODY_PART_MAX_HITS
  const hits = Random.getInteger(
    Random.getInteger(Random.getInteger(1, hitsMax - 1), hitsMax - 1),
    hitsMax - 1,
  )

  let remainingHits = hitsMax - hits

  for (let i = body.length - 1; i >= 0; i--) {
    if (remainingHits > body[i].hits) {
      remainingHits -= BODY_PART_MAX_HITS
      body[i].hits = 0
    } else {
      body[i].hits -= remainingHits
      break
    }
  }

  const ticksToLive = Random.getInteger(1, CREEP_LIFE_TIME)

  const newCreep: IObject = {
    id: id as Id<Creep>,
    objectType: EObjectType.CREEP,
    my,
    pos: pos as RoomPosition,
    body,
    hitsMax,
    hits,
    fatigue: 0,
    ticksToLive,
  }

  return [...objects, newCreep]
}

const getRandomPosition = (
  room: IRoom,
  objects: IObject[],
  terrain: ITerrainMap,
  ignoreSwamps = false,
): IPosition =>
  Random.getArrayItem(
    getAvailablePositions(room, objects, terrain, ignoreSwamps),
  ) as IPosition

const getAvailablePositions = (
  room: IRoom,
  objects: IObject[],
  terrain: ITerrainMap,
  ignoreSwamps = false,
): IPosition[] => {
  const availablePositions: IPosition[] = []

  let occupiedPositions: IPosition[] = objects.map(({pos}) =>
    Position.fromRoomPosition(pos),
  )

  for (let x = 0; x < room.width; x++) {
    for (let y = 0; y < room.height; y++) {
      const newPosition = {x, y}

      if (!occupiedPositions.find(pos => Position.equal(pos, newPosition))) {
        if (
          !terrain ||
          !terrain[Position.hash(newPosition)] ||
          (ignoreSwamps &&
            terrain[Position.hash(newPosition)].terrain !== TERRAIN_MASK_WALL)
        ) {
          availablePositions.push({x, y})
        }
      }
    }
  }

  return availablePositions
}
