import {IPosition} from '../types/common'

export class Position {
  public static fromRoomPosition(roomPosition: RoomPosition): IPosition {
    return {x: roomPosition.x, y: roomPosition.y}
  }

  public static hash(pos: IPosition): string {
    return `${pos.x}:${pos.y}`
  }

  public static decodeFromHash(hash: string): IPosition {
    const [x, y] = hash.split(':').map(Number)
    return {x, y}
  }

  public static equal(...positions: IPosition[]): boolean {
    const hashes = positions.map(pos => Position.hash(pos))
    return Boolean(hashes.every(hash => hash === hashes[0]))
  }

  public static touching(a: IPosition, b: IPosition): boolean {
    return Boolean(
      (Math.abs(a.x - b.x) === 1 && a.y - b.y === 0) ||
        (a.x - b.x === 0 && Math.abs(a.y - b.y) === 1),
    )
  }
}
