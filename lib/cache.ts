import {verbose, warn} from './log'
import {IFeed} from './types/feed'
import {generateRoom, IRoomGenerationProps} from './generator'

let map: IFeed | null = null

export const getMap = (config: IRoomGenerationProps): Promise<IFeed | null> =>
  new Promise(resolve => {
    if (!map) {
      warn('Asked for a map when it was not ready yet!')
      generate(config)
    }

    map = null
    resolve(map)

    if (!map) {
      generate(config)
    }
  })

const generate = (config: IRoomGenerationProps) => {
  verbose('Generating new map...')
  map = generateRoom(config)
  verbose('Map is prepared and cached!')
}
