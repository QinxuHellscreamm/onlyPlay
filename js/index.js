
var physics_accuracy  = 3,//物理学精确性
    mouse_influence   = 20,//有效影响范围
    mouse_cut         = 5,//剪切值
    gravity           = 1200,//重力引力
    cloth_height      = 30,
    cloth_width       = 50,//横向网格的数量
    start_y           = 20,
    spacing           = 7,//一个方格的大小
    tear_distance     = 60;

//requestAnimationFrame() 动画 参数1、callback fixfox中可选，Chrome必选  参数2、element  element对于canvas或者webGL来说其实就是<canvas></canvas>元素，对于dom节点来说，可以不去理会。这里是requestAnimationFrame的标准定义使用方式
window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
};

var canvas,
    ctx,
    cloth,
    boundsx,//界限
    boundsy,
    mouse = {//mouse 对象
        down: false,//控制阀用途，鼠标是否被按下
        button: 1,
        x: 0,
        y: 0,
        px: 0,
        py: 0
    };

var Point = function (x, y) {//Point网格对象 它的属性都是靠传参的方式得到的
    this.x      = x;
    this.y      = y;
    this.px     = x;
    this.py     = y;
    this.vx     = 0;
    this.vy     = 0;
    this.pin_x  = null;
    this.pin_y  = null;
    
    this.constraints = [];//约束
};

Point.prototype={//网格对象的原型
    update :function (delta){
        if (mouse.down) {//鼠标按下状态的时候

            var diff_x = this.x - mouse.x,//this指向的是函数的调用者也就是update是函数而Point对象才能调用它 diff_x=网格本身的位置-鼠标的位置 那应该就=拖动的位置 这里是依赖start函数中的鼠标事件
                diff_y = this.y - mouse.y,
                dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);//sqrt可以返回一个数的平方根 比如 说Math.sqrt(4)=2 这里是勾股定理即两条直角边的平方等于斜边的平方 得到的是Point移动的真实距离
            if (mouse.button == 1) {

                if (dist < mouse_influence) {//dist是一个真实的移动距离 如果移动的距离小于有效范围的话执行里面的语句
                    this.px = this.x - (mouse.x - mouse.px) * 1.8;//Point的移动的距离px值就等于 网格本身的坐标值-鼠标在canvas画布中移动的距离*1.8
                    this.py = this.y - (mouse.y - mouse.py) * 1.8;
                }

            } else if (dist < mouse_cut) this.constraints = [];//如果Point移动的真实距离<剪切值，this.constraints为空数组
        }

        this.add_force(0, gravity);//调用Point的add_force添加重力方法

        delta *= delta;//实参自乘
        nx = this.x + ((this.x - this.px) *.99) + ((this.vx / 2) * delta);//Point的坐标值+（Point的坐标值-Point移动的距离）+（加速度/2）*delta的平方
        ny = this.y + ((this.y - this.py) *.99)+ ((this.vy / 2) * delta);

        this.px = this.x;//px初始化
        this.py = this.y;

        this.x = nx;
        this.y = ny;

        this.vy = this.vx = 0//加速度归零
    },
    draw:function () {//绘图方法

        if (!this.constraints.length) return;

        var i = this.constraints.length;
        while (i--) this.constraints[i].draw();//遍历constrants数组中的Constraint对象，调用此对象的draw方法
    },
    resolve_constraints:function () {//解决约束

        if (this.pin_x != null && this.pin_y != null) {//pinx，piny都不为空时  pinx初始值为空在Point的pin方法中通过传参赋值

            this.x = this.pin_x; //将pinx赋值给x
            this.y = this.pin_y;

        }

        var i = this.constraints.length;
        while (i--) this.constraints[i].resolve();

        this.x > boundsx ? this.x = 2 * boundsx - this.x : 1 > this.x && (this.x = 2 - this.x);
        this.y < 1 ? this.y = 2 - this.y : this.y > boundsy && (this.y = 2 * boundsy - this.y);
    },
    attach:function (point) {//附着方法 在Close的构造函数中被调用 它的作用就是为constrints数组添加new出来的Constraint对象

        this.constraints.push(
            new Constraint(this, point)//Constraint第一个参数this指向的是Point对象
        );
    },
    remove_constraint:function (constraint) {

        this.constraints.splice(this.constraints.indexOf(constraint), 1);
    },
    add_force:function (x, y) {//添加 推动方法 在update中被调用
        this.vx += x;
        this.vy += y;//y值是变化的
    },
    pin:function (pinx, piny) {
        this.pin_x = pinx;
        this.pin_y = piny;
    }
}

var Constraint = function (p1, p2) {//约束对象

    this.p1     = p1;
    this.p2     = p2;
    this.length = spacing;
};

Constraint.prototype ={
    resolve : function (){
        var diff_x  = this.p1.x - this.p2.x,
            diff_y  = this.p1.y - this.p2.y,
            dist    = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
            diff    = (this.length - dist) / dist;

        if (dist > tear_distance) this.p1.remove_constraint(this);

        var px = diff_x * diff * 0.5;
        var py = diff_y * diff * 0.5;

        this.p1.x += px;
        this.p1.y += py;
        this.p2.x -= px;
        this.p2.y -= py;
    },
    draw:function () {

        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
    }
};

var Cloth = function () {//布料的构造函数 它是在start函数中创建实例

    this.points = [];

    var start_x = canvas.width / 2 - cloth_width * spacing / 2;//start_x等于canvas画布一半的宽度 - 网格的数量 * 二分之一个网格的大小 其实就是控制布帘居中的公式

    for (var y = 0; y <= cloth_height; y++) {

        for (var x = 0; x <= cloth_width; x++) {

            var p = new Point(start_x + x * spacing, start_y + y * spacing); //利用for循环创建网格对象的实例
            //短路用法如果x!=0返回false则返回false,如果前面的表达式成立则返回后面的表达式，这里是如果x不等于0的话就运行后面的程序
            x != 0 && p.attach(this.points[this.points.length - 1]);
            //调用Point的attach方法将points数组中的length-1个元素当作实参传入 但是attach方法在for循环x=0的时候不被调用，在x=1的时候才被调用但是调用的时候points这个数组里面并木有Point元素所以未给attach这个方法传参 所以这一次Constrant也只有一个this被push，
            // 这个逻辑其实就是在new Constrant的时候里面的第二个参数是上次的第一个参数
            y == 0 && p.pin(p.x, p.y);//当y不等于0的时候调用pin方法两个参数就是当前的Point的横纵坐标值
            y != 0 && p.attach(this.points[x + (y - 1) * (cloth_width + 1)])//y大于等于1的时候Point对象调用attach方法 传入的参数是上一行的第x个Point对象

            this.points.push(p);//this指向的是Cloth构造函数 Cloth.points存放所有的P网格对象 在这里呢其实是Point对象存放在Cloth的一个属性里。
        }
    }
};

Cloth.prototype={
    update : function () {
        var i = physics_accuracy;

        while (i--) {
            var p = this.points.length;
            while (p--) this.points[p].resolve_constraints();
        }

        i = this.points.length;
        while (i--) this.points[i].update(.016);//这里其实调用的是Point的方法 因为在Close的构造函数里已经通过for循环将每个Point对象push进Close的Points数组当中了
    },
    draw : function () {//Cloth中的draw方法中先开启新路径 然后再遍历网格数组中的对象，调用Point的draw方法

    ctx.beginPath();

    var i = cloth.points.length;
    while (i--) cloth.points[i].draw();

    ctx.stroke();
    }

}


function update() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cloth.update();
    cloth.draw();

    requestAnimFrame(update);//requestAnimFrame是一个带有回调参数的动画方法，它的参数是一个callback回调函数，它的使用原理就是用递归调用setTimeout来实现setInterval 在canvas中的动画帧中很常见 常用方法就是递归调用
}

function start() {//start函数 在window.onlode后执行

    canvas.onmousedown = function (e) {//鼠标按下的时候canvas的事件处理程序
        mouse.button  = e.which;//event.which可以监听用户按下的是哪个键 鼠标的话左键，滚轮，右键分别返回的是1、2、3 将返回的值赋值给mouse对象的button
        mouse.px      = mouse.x;//mouse的px，py赋值为鼠标刚按下的时候的坐标值
        mouse.py      = mouse.y;
        var rect      = canvas.getBoundingClientRect();//在下面的canvas.mousemove中有详细注释
        mouse.x       = e.clientX - rect.left,//mouse的x赋值为（鼠标在整个窗口内的坐标 - canvas画布距离页面最左侧的距离 ）=鼠标在canvas中的坐标
        mouse.y       = e.clientY - rect.top,
        mouse.down    = true;
        e.preventDefault();
    };

    canvas.onmouseup = function (e) {
        mouse.down = false;//鼠标弹起的时候更改控制阀
        e.preventDefault();
    };

    canvas.onmousemove = function (e) {//当mousemove的时候创建cloth对象并且调用主update
        mouse.px  = mouse.x;//mouse对象当move事件的时候为先用px记录鼠标在啊canvas中的位置mouse.x 然后再用mouse.x来再次存储鼠标在画布中的位置
        mouse.py  = mouse.y;// 这样写导致如果是往左移动的话x值会比px小因为px值其实是赋值的上次移动事件中的x的值，而x值是此次事件中监听到的x的坐标
        var rect  = canvas.getBoundingClientRect();//这个方法返回一个矩形对象，包括left，top，right，buttom
        mouse.x   = e.clientX - rect.left//rect.left可以得到布帘到canvas画布的距离
        mouse.y   = e.clientY - rect.top
        e.preventDefault();//可有可无但是通常canvas或者移动端中经常会阻止默认事件
    };

    canvas.oncontextmenu = function (e) {//鼠标右键事件
        e.preventDefault();//阻止默认事件
    };

    boundsx = canvas.width - 1;
    boundsy = canvas.height - 1;

    ctx.strokeStyle = '#888';
  
    cloth = new Cloth();
  
    update();
}

window.onload = function () {

    canvas  = document.getElementById('c');
    ctx     = canvas.getContext('2d');

    canvas.width  = 560;
    canvas.height = 350;

    start();
};