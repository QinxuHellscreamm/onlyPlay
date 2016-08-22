
var physics_accuracy  = 3,//����ѧ��ȷ��
    mouse_influence   = 20,//��ЧӰ�췶Χ
    mouse_cut         = 5,//����ֵ
    gravity           = 1200,//��������
    cloth_height      = 30,
    cloth_width       = 50,//�������������
    start_y           = 20,
    spacing           = 7,//һ������Ĵ�С
    tear_distance     = 60;

//requestAnimationFrame() ���� ����1��callback fixfox�п�ѡ��Chrome��ѡ  ����2��element  element����canvas����webGL��˵��ʵ����<canvas></canvas>Ԫ�أ�����dom�ڵ���˵�����Բ�ȥ��ᡣ������requestAnimationFrame�ı�׼����ʹ�÷�ʽ
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
    boundsx,//����
    boundsy,
    mouse = {//mouse ����
        down: false,//���Ʒ���;������Ƿ񱻰���
        button: 1,
        x: 0,
        y: 0,
        px: 0,
        py: 0
    };

var Point = function (x, y) {//Point������� �������Զ��ǿ����εķ�ʽ�õ���
    this.x      = x;
    this.y      = y;
    this.px     = x;
    this.py     = y;
    this.vx     = 0;
    this.vy     = 0;
    this.pin_x  = null;
    this.pin_y  = null;
    
    this.constraints = [];//Լ��
};

Point.prototype={//��������ԭ��
    update :function (delta){
        if (mouse.down) {//��갴��״̬��ʱ��

            var diff_x = this.x - mouse.x,//thisָ����Ǻ����ĵ�����Ҳ����update�Ǻ�����Point������ܵ����� diff_x=�������λ��-����λ�� ��Ӧ�þ�=�϶���λ�� ����������start�����е�����¼�
                diff_y = this.y - mouse.y,
                dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);//sqrt���Է���һ������ƽ���� ���� ˵Math.sqrt(4)=2 �����ǹ��ɶ�������ֱ�Ǳߵ�ƽ������б�ߵ�ƽ�� �õ�����Point�ƶ�����ʵ����
            if (mouse.button == 1) {

                if (dist < mouse_influence) {//dist��һ����ʵ���ƶ����� ����ƶ��ľ���С����Ч��Χ�Ļ�ִ����������
                    this.px = this.x - (mouse.x - mouse.px) * 1.8;//Point���ƶ��ľ���pxֵ�͵��� �����������ֵ-�����canvas�������ƶ��ľ���*1.8
                    this.py = this.y - (mouse.y - mouse.py) * 1.8;
                }

            } else if (dist < mouse_cut) this.constraints = [];//���Point�ƶ�����ʵ����<����ֵ��this.constraintsΪ������
        }

        this.add_force(0, gravity);//����Point��add_force�����������

        delta *= delta;//ʵ���Գ�
        nx = this.x + ((this.x - this.px) *.99) + ((this.vx / 2) * delta);//Point������ֵ+��Point������ֵ-Point�ƶ��ľ��룩+�����ٶ�/2��*delta��ƽ��
        ny = this.y + ((this.y - this.py) *.99)+ ((this.vy / 2) * delta);

        this.px = this.x;//px��ʼ��
        this.py = this.y;

        this.x = nx;
        this.y = ny;

        this.vy = this.vx = 0//���ٶȹ���
    },
    draw:function () {//��ͼ����

        if (!this.constraints.length) return;

        var i = this.constraints.length;
        while (i--) this.constraints[i].draw();//����constrants�����е�Constraint���󣬵��ô˶����draw����
    },
    resolve_constraints:function () {//���Լ��

        if (this.pin_x != null && this.pin_y != null) {//pinx��piny����Ϊ��ʱ  pinx��ʼֵΪ����Point��pin������ͨ�����θ�ֵ

            this.x = this.pin_x; //��pinx��ֵ��x
            this.y = this.pin_y;

        }

        var i = this.constraints.length;
        while (i--) this.constraints[i].resolve();

        this.x > boundsx ? this.x = 2 * boundsx - this.x : 1 > this.x && (this.x = 2 - this.x);
        this.y < 1 ? this.y = 2 - this.y : this.y > boundsy && (this.y = 2 * boundsy - this.y);
    },
    attach:function (point) {//���ŷ��� ��Close�Ĺ��캯���б����� �������þ���Ϊconstrints�������new������Constraint����

        this.constraints.push(
            new Constraint(this, point)//Constraint��һ������thisָ�����Point����
        );
    },
    remove_constraint:function (constraint) {

        this.constraints.splice(this.constraints.indexOf(constraint), 1);
    },
    add_force:function (x, y) {//��� �ƶ����� ��update�б�����
        this.vx += x;
        this.vy += y;//yֵ�Ǳ仯��
    },
    pin:function (pinx, piny) {
        this.pin_x = pinx;
        this.pin_y = piny;
    }
}

var Constraint = function (p1, p2) {//Լ������

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

var Cloth = function () {//���ϵĹ��캯�� ������start�����д���ʵ��

    this.points = [];

    var start_x = canvas.width / 2 - cloth_width * spacing / 2;//start_x����canvas����һ��Ŀ�� - ��������� * ����֮һ������Ĵ�С ��ʵ���ǿ��Ʋ������еĹ�ʽ

    for (var y = 0; y <= cloth_height; y++) {

        for (var x = 0; x <= cloth_width; x++) {

            var p = new Point(start_x + x * spacing, start_y + y * spacing); //����forѭ��������������ʵ��
            //��·�÷����x!=0����false�򷵻�false,���ǰ��ı��ʽ�����򷵻غ���ı��ʽ�����������x������0�Ļ������к���ĳ���
            x != 0 && p.attach(this.points[this.points.length - 1]);
            //����Point��attach������points�����е�length-1��Ԫ�ص���ʵ�δ��� ����attach������forѭ��x=0��ʱ�򲻱����ã���x=1��ʱ��ű����õ��ǵ��õ�ʱ��points����������沢ľ��PointԪ������δ��attach����������� ������һ��ConstrantҲֻ��һ��this��push��
            // ����߼���ʵ������new Constrant��ʱ������ĵڶ����������ϴεĵ�һ������
            y == 0 && p.pin(p.x, p.y);//��y������0��ʱ�����pin���������������ǵ�ǰ��Point�ĺ�������ֵ
            y != 0 && p.attach(this.points[x + (y - 1) * (cloth_width + 1)])//y���ڵ���1��ʱ��Point�������attach���� ����Ĳ�������һ�еĵ�x��Point����

            this.points.push(p);//thisָ�����Cloth���캯�� Cloth.points������е�P������� ����������ʵ��Point��������Cloth��һ�������
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
        while (i--) this.points[i].update(.016);//������ʵ���õ���Point�ķ��� ��Ϊ��Close�Ĺ��캯�����Ѿ�ͨ��forѭ����ÿ��Point����push��Close��Points���鵱����
    },
    draw : function () {//Cloth�е�draw�������ȿ�����·�� Ȼ���ٱ������������еĶ��󣬵���Point��draw����

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

    requestAnimFrame(update);//requestAnimFrame��һ�����лص������Ķ������������Ĳ�����һ��callback�ص�����������ʹ��ԭ������õݹ����setTimeout��ʵ��setInterval ��canvas�еĶ���֡�кܳ��� ���÷������ǵݹ����
}

function start() {//start���� ��window.onlode��ִ��

    canvas.onmousedown = function (e) {//��갴�µ�ʱ��canvas���¼��������
        mouse.button  = e.which;//event.which���Լ����û����µ����ĸ��� ���Ļ���������֣��Ҽ��ֱ𷵻ص���1��2��3 �����ص�ֵ��ֵ��mouse�����button
        mouse.px      = mouse.x;//mouse��px��py��ֵΪ���հ��µ�ʱ�������ֵ
        mouse.py      = mouse.y;
        var rect      = canvas.getBoundingClientRect();//�������canvas.mousemove������ϸע��
        mouse.x       = e.clientX - rect.left,//mouse��x��ֵΪ����������������ڵ����� - canvas��������ҳ�������ľ��� ��=�����canvas�е�����
        mouse.y       = e.clientY - rect.top,
        mouse.down    = true;
        e.preventDefault();
    };

    canvas.onmouseup = function (e) {
        mouse.down = false;//��굯���ʱ����Ŀ��Ʒ�
        e.preventDefault();
    };

    canvas.onmousemove = function (e) {//��mousemove��ʱ�򴴽�cloth�����ҵ�����update
        mouse.px  = mouse.x;//mouse����move�¼���ʱ��Ϊ����px��¼����ڰ�canvas�е�λ��mouse.x Ȼ������mouse.x���ٴδ洢����ڻ����е�λ��
        mouse.py  = mouse.y;// ����д��������������ƶ��Ļ�xֵ���pxС��Ϊpxֵ��ʵ�Ǹ�ֵ���ϴ��ƶ��¼��е�x��ֵ����xֵ�Ǵ˴��¼��м�������x������
        var rect  = canvas.getBoundingClientRect();//�����������һ�����ζ��󣬰���left��top��right��buttom
        mouse.x   = e.clientX - rect.left//rect.left���Եõ�������canvas�����ľ���
        mouse.y   = e.clientY - rect.top
        e.preventDefault();//���п��޵���ͨ��canvas�����ƶ����о�������ֹĬ���¼�
    };

    canvas.oncontextmenu = function (e) {//����Ҽ��¼�
        e.preventDefault();//��ֹĬ���¼�
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