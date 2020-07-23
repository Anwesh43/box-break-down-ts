const w : number = window.innerWidth
const h : number = window.innerHeight
const parts : number = 3
const scGap : number = 0.02 / parts
const delay : number = 20
const sizeFactor : number = 8
const foreColors : Array<String> = ["#3F51B5", "#FF5722", "#f44336", "#4CAF50", "#6200EA"]
const backColor : string = "#bdbdbd"

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }
}

class DrawingUtil {

    static drawBoxBreakDown(context : CanvasRenderingContext2D, i : number, scale : number) {
        const sf : number = ScaleUtil.sinify(scale)
        const sf1 : number = ScaleUtil.divideScale(sf, 0, parts)
        const sf2 : number = ScaleUtil.divideScale(sf, 1, parts)
        const sf3 : number = ScaleUtil.divideScale(sf, 2, parts)
        const size : number = Math.min(w, h) / 8
        context.save()
        context.translate((w / 2 - size) * (sf3 - sf2), h / 2 * sf3 + (h / 2 - size) * sf2)
        context.fillRect((-size) * sf1, 0, size * sf1, size)
        context.restore()
    }
    static drawBBDNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.fillStyle = foreColors[i]
        context.save()
        context.translate(w / 2, 0)
        for (var j = 0; j < 2; j++) {
            context.save()
            context.scale(1 - 2 * j, 1)
            DrawingUtil.drawBoxBreakDown(context, i, scale)
            context.restore()
        }
        context.restore()
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas = document.createElement('canvas')
        this.canvas.width = w
        this.canvas.height = h
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += this.dir * scGap
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {

    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class BBDNode {

    state : State = new State()
    next : BBDNode
    prev : BBDNode

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < foreColors.length - 1) {
            this.next = new BBDNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawBBDNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : BBDNode {
        var curr : BBDNode = this.prev
        if (dir == 1) {
            curr = this.next
        }
        if (curr) {
            return curr
        }
        cb()
        return this
    }
}

class BoxBreakDown {

    curr : BBDNode = new BBDNode(0)
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () =>{
                this.dir *= -1
            })
            cb()
        })
    }
}

class Renderer {

    bbd : BoxBreakDown = new BoxBreakDown()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.bbd.draw(context)
    }

    handleTap(cb : Function) {
        this.bbd.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.bbd.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
