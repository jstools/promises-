// import { nextTick } from './nextTick'

const nextTick = process.nextTick

// const PENDING = 'PENDING'
// const FULFILLED = 'FULFILLED'
// const REJECTED = 'REJECTED'

enum PromiseStates {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
}

const {
  PENDING,
  FULFILLED,
  REJECTED,
} = PromiseStates

// interface ThenQueueEntry {
//   onFulfill: Function | null
//   onReject: Function | null
// }

interface DeferredObject {
  promise?: Parole
  resolve?: Function
  reject?: Function
}

function isObject (o: any): boolean {
  return typeof o === 'object'
}

function isFunction (o: any): boolean {
  return typeof o === 'function'
}

// const noop = (result: any) => result

// export function isThenable (o: any): boolean {
//   // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
//   if (!o) return false
//   if (typeof o !== 'object' && typeof o !== 'function') return false
//   if (typeof o.then !== 'function') return false
//   return true
// }

function runThen (fn: Function, x: any, resolve: Function, reject: Function): void {
  try {
    resolve(fn(x))
  } catch (err) {
    reject(err)
  }
}

export class Parole {
  value: any = null
  state: PromiseStates = PENDING
  
  private isCompleted: boolean = false
  private fulfillQueue: Function[] | null = []
  private rejectQueue: Function[] | null = []

  private doComplete (value: any, state: PromiseStates): void {
    if (this.isCompleted) return
    this.isCompleted = true

    this.value = value
    this.state = state

    nextTick(() => {
      ;(
        state === FULFILLED
          ? this.fulfillQueue
          : this.rejectQueue
      )?.forEach((run) => run(value))

      this.fulfillQueue = null
      this.rejectQueue = null
    })
  }

  private doResolve (x: any): void {
    try {
      if (x === this) throw new TypeError('resolve value is the promise itself')

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const xThen = x && (isObject(x) || isFunction(x)) && x.then

      if (isFunction(xThen)) {
        xThen.call(
          x,
          (_x: any) => !this.isCompleted && this.doResolve(_x),
          (_r: any) => this.doComplete(_r, REJECTED),
        )
      } else {
        this.doComplete(x, FULFILLED)
      }
    } catch (err) {
      this.doComplete(err, REJECTED)
    }
  }

  private doReject (reason: any): void {
    this.doComplete(reason, REJECTED)
  }

  constructor (runFn: Function) {
    try {
      runFn(this.doResolve.bind(this), this.doReject.bind(this))
    } catch (err) {
      this.doReject(err)
    }
  }

  then (onFulfill: any = null, onReject: any = null): Parole {
    return new Parole((resolve: Function, reject: Function) => {
      const thenFulfill = isFunction(onFulfill)
        ? (x: any) => runThen(onFulfill, x, resolve, reject)
        : (x: any) => resolve(x)

      const thenReject = isFunction(onReject)
        ? (x: any) => runThen(onReject, x, resolve, reject)
        : (x: any) => reject(x)

      if (this.state === FULFILLED) nextTick(() => thenFulfill(this.value))
      else if (this.state === REJECTED) nextTick(() => thenReject(this.value))
      else {
        this.fulfillQueue?.push(thenFulfill)
        this.rejectQueue?.push(thenReject)
      }
    })
  }

  catch (onReject: any = null): Parole {
    return this.then(null, onReject)
  }

  static resolve (x: any): Parole {
    return new Parole((resolve: Function) => resolve(x))
  }

  static reject (reason: any): Parole {
    return new Parole((resolve: Function, reject: Function) => reject(reason))
  }

  static defer (): DeferredObject {
    const deferred: DeferredObject = {}
    deferred.promise = new Parole((resolve: Function, reject: Function) => {
      deferred.resolve = resolve
      deferred.reject = reject
    })
    return deferred
  }
}
