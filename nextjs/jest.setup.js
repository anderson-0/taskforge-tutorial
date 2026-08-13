/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-dom'

const { TextDecoder, TextEncoder } = require('util')
const webStreams = require('stream/web')

Object.assign(globalThis, { TextDecoder, TextEncoder }, webStreams)

const webPrimitives = require('next/dist/compiled/@edge-runtime/primitives/fetch')

Object.assign(globalThis, {
  Headers: webPrimitives.Headers,
  Request: webPrimitives.Request,
  Response: webPrimitives.Response,
})
