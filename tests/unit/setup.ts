// Browsers mark the `finished` rejection of a cancelled animation as handled; happy-dom does not.
if (typeof Animation !== 'undefined') {
  const cancel = Animation.prototype.cancel
  Animation.prototype.cancel = function () {
    this.finished.catch(() => {})
    cancel.call(this)
  }
}

// happy-dom never reports intersections, so treat every observed element as on screen.
class VisibleObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    queueMicrotask(() =>
      this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as never),
    )
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
if (typeof window !== 'undefined') globalThis.IntersectionObserver = VisibleObserver as never
