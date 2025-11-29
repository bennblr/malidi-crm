import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import 'dayjs/locale/ru'

// Настройка dayjs для русского формата
dayjs.extend(customParseFormat)
dayjs.locale('ru')

// Экспортируем настроенный dayjs
export default dayjs

