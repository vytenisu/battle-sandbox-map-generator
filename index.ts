import './lib/constants/global'
import {ELogLevel, init} from './lib/log'
import {launch} from './lib/server'

init('Generator', ELogLevel.verbose)
launch()
