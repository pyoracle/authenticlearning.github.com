/* TODO(csilvers): fix these lint errors (http://eslint.org/docs/rules): */
/* eslint-disable camelcase, comma-dangle, indent, max-len, no-undef, no-var, one-var */
/* To fix, remove an entry above, run ka-lint, and fix errors. */

define(function(require) {

require("../third_party/jquery.mobile.vmouse.js");

window.DrawingScratchpad = function(elem) {
    var pen = "M25.31,2.872l-3.384-2.127c-0.854-0.536-1.979-0.278-2.517,0.576l-1.334,2.123l6.474,4.066l1.335-2.122C26.42,4.533,26.164,3.407,25.31,2.872zM6.555,21.786l6.474,4.066L23.581,9.054l-6.477-4.067L6.555,21.786zM5.566,26.952l-0.143,3.819l3.379-1.787l3.14-1.658l-6.246-3.925L5.566,26.952z";
    var erase = "M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248";
    var undo = "M12.981,9.073V6.817l-12.106,6.99l12.106,6.99v-2.422c3.285-0.002,9.052,0.28,9.052,2.269c0,2.78-6.023,4.263-6.023,4.263v2.132c0,0,13.53,0.463,13.53-9.823C29.54,9.134,17.952,8.831,12.981,9.073z";

    var rainbow = "0-#00ff00-#ff0000:50-#0000ff";

    var nextRainbowStroke = (function() {
        var freq = 0.05;
        var iter = 0;
        return function() {
            var red   = Math.sin(freq * iter + -3) * 127 + 128;
            var green = Math.sin(freq * iter + -1) * 127 + 128;
            var blue  = Math.sin(freq * iter + 1) * 127 + 128;
            iter++;
            return "rgb(" + red + "," + green + "," + blue + ")";
        };
    })();

    if (!elem) {
        throw new Error("No element provided to DrawingScratchpad");
    }

    var container = $(elem);

    var pad = Raphael(container[0], container.width(), container.height());

    this.resize = function() {
        pad.setSize(container.width(), container.height());
    };

    var palette = pad.set(), stroke = rainbow, colors = [rainbow, "#000000", "#3f3f3f", "#7f7f7f", "#bfbfbf", "#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#00ffff", "#007fff", "#0000ff", "#7f00ff"];
    for (var i = 0; i < colors.length; i++) {
        (function(color) {
            var setcolor = function(e) {
                stroke = color;
                palette.animate({y: 7}, 100);
                this.animate({y: 15}, 100);
                penclick();
            };
            palette.push(pad.rect(90 + i * 27, 7, 24, 24).attr({
                fill: color,
                stroke: "#ccc"
                }).touchstart(setcolor).click(setcolor));
        })(colors[i]);
    }
    palette[0].attr({y: 15});

    var selected = pad.rect(2, 2, 30, 30).attr({
        r: 5,
        stroke: "",
        fill: "rgba(30, 157, 186, 0.5)"
    });

    var line_default = {
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"};

    var shapes = pad.set();
    var undoHistory = [[]];

    function saveState() {
        for (var i = 0, state = []; i < shapes.length; i++) {
            if (!shapes[i].removed) {
                if (shapes[i].type === "path") {
                    state.push({
                        path: shapes[i].attr("path").toString(),
                        stroke: shapes[i].attr("stroke"),
                        type: "path"
                    });
                }
            }
        }
        undoHistory.push(state);
    }

    function loadState(state) {
        shapes.remove();
        for (var i = 0; i < state.length; i++) {
            if (state[i].type === "path") {
                shapes.push(pad.path(state[i].path).attr(line_default).attr({
                    stroke: state[i].stroke,
                    "clip-rect": [0, 40, pad.width, pad.height - 40]
                }));
            }
        }
    }

    /*
    * Hi. I did this with VectorEdtor, so I guess I'll try to do the same here with scratchpad
    * If someone is there, reading this code, in the distant future, say, the year 2012 and you
    * are, as any sensible human would, be preparing for the mayan-predicted impending apocalypse,
    * (or not) it doesn't matter. You should totally email me at antimatter15@gmail.com because,
    * it's always an interesting feeling.
    */

    var tools = pad.set();

    tools.push(pad.path(pen).scale(0.8).translate(0, 0));
    tools.push(pad.path(erase).translate(30, 0));
    tools.push(pad.path(undo).scale(0.7).translate(60, 1));

    var tool = "draw";
    function penclick() {
        selected.animate({x: 2}, 100);
        tool = "draw";
    }
    pad.rect(2, 2, 30, 30)
        .attr({
            stroke: "",
            fill: "black",
            "fill-opacity": 0
        })
        .click(penclick).touchstart(penclick);
    function eraseclick() {
        selected.animate({x: 2 + 30}, 100);
        tool = "erase";
    }
    pad.rect(2 + 30, 2, 30, 30)
        .attr({
            stroke: "",
            fill: "black",
            "fill-opacity": 0
        })
        .click(eraseclick).touchstart(eraseclick);
    function undoclick() {
        if (undoHistory.length) {
            loadState(undoHistory.pop());
        }
    }
    pad.rect(2 + 30 * 2, 2, 30, 30)
        .attr({
            stroke: "",
            fill: "black",
            "fill-opacity": 0
        })
        .click(undoclick).touchstart(undoclick);

    tools.attr({fill: "#000", stroke: "none"});
    var path = null, pathstr = "", prevPen;
    var eraser = null;

    function mousedown(X, Y, e) {
        if (!X || !Y || !e) {
            return;
        }
        if (Y <= 40) {
            return;
        }

        if (eraser) {
            eraser.remove();
            eraser = null;
        }

        if (tool === "draw") {
            saveState();
            startPen(X, Y);
        } else if (tool === "erase") {
            eraser = pad.rect(X, Y, 0, 0).attr({
                "fill-opacity": 0.15,
                "stroke-opacity": 0.5,
                "fill": "#ff0000",  // oh noes! its red and gonna asplodes!
                "stroke": "#ff0000"
            });
            eraser.sx = X;
            eraser.sy = Y;
        }
    }

    function startPen(x, y) {
        var singleColorStroke = (stroke === rainbow) ?
            nextRainbowStroke() :
            stroke;
        path = pad.path("M" + x + "," + y).attr(line_default).attr({
            stroke: singleColorStroke,
            "clip-rect": [0, 40, pad.width, pad.height - 40]
        });
        pathstr = path.attr("path");
        shapes.push(path);
        prevPen = {x: x, y: y};
    }

    function rectsIntersect(r1, r2) {
        return r2.x < (r1.x + r1.width) &&
            (r2.x + r2.width) > r1.x &&
            r2.y < (r1.y + r1.height) &&
            (r2.y + r2.height) > r1.y;
    }


    function mouseup(x, y) {
        if (tool === "draw" && path) {
            pathstr += "L" + x + "," + y;
            prevPen = null;
            path.attr("path", pathstr);
        }
        path = null;
        if (tool === "erase" && eraser) {
            saveState();
            var actuallyErased = false;
            var ebox = eraser.getBBox();
            for (var i = 0; i < shapes.length; i++) {
                if (rectsIntersect(ebox, shapes[i].getBBox())) {
                    actuallyErased = true;
                    shapes[i].remove();
                }
            }
            if (!actuallyErased) {
                undoHistory.pop();
            }
            var e = eraser;
            eraser = null;
            e.animate({opacity: 0}, 100, function() {
                e.remove();
            });
        }

    }

    function mousemove(X, Y) {
        if (tool === "draw" && path) {
            pathstr += "Q" + prevPen.x + "," + prevPen.y + "," +
                (prevPen.x + X) / 2 + "," + (prevPen.y + Y) / 2;
            prevPen = {x: X, y: Y};
            path.attr("path", pathstr);
        } else if (tool === "erase" && eraser) {
            var x1 = Math.min(X, eraser.sx),
                x2 = Math.max(X, eraser.sx),
                y1 = Math.max(40, Math.min(Y, eraser.sy)),
                y2 = Math.max(40, Math.max(Y, eraser.sy));
            eraser.attr({
                x: x1,
                y: y1,
                width: x2 - x1,
                height: y2 - y1
            });
        }
    }

    var handleMousemove = function(e) {
        var offset = $(container).offset();
        mousemove(e.pageX - offset.left, e.pageY - offset.top);
        e.preventDefault();
    };
    $(container).on("vmousedown", function(e) {
        var offset = $(container).offset();
        mousedown(e.pageX - offset.left, e.pageY - offset.top, e);
        e.preventDefault();

        $(document).on("vmousemove", handleMousemove);
        $(document).one("vmouseup", function(e) {
            mouseup(e.pageX - offset.left, e.pageY - offset.top, e);
            e.preventDefault();
            $(document).off("vmousemove", handleMousemove);
        });
    });

    this.clear = function() {
        shapes.remove();
        undoHistory = [[]];
    };
};

});
