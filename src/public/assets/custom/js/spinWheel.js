class SpinWheel {

    #padding;
    #w;
    #h;
    #r;
    #rotation;
    #oldrotation;
    #picked;
    #oldpick;
    #color;
    #data;
    #container;
    #vis;
    #element;

    constructor(data, element) {
        this.#padding = {top: 20, right: 40, bottom: 0, left: 0};
        this.#w = 500 - this.#padding.left - this.#padding.right;
        this.#h = 500 - this.#padding.top - this.#padding.bottom;
        this.#r = Math.min(this.#w, this.#h) / 2;
        this.#rotation = 0;
        this.#oldrotation = 0;
        this.#picked = 100000;
        this.#oldpick = [];
        this.#color = d3.scale.category20();
        this.#data = data;
        this.#element = element;
    }

    draw() {
        this.#createSVG();
        this.#createPieChart();
    }

    #createSVG() {
        const svg = d3
            .select(this.#element)
            .append('svg')
            .data([this.#data])
            .attr('width', this.#w + this.#padding.left + this.#padding.right)
            .attr('height', this.#h + this.#padding.top + this.#padding.bottom);

        this.#container = svg
            .append('g')
            .attr('class', 'chartholder')
            .attr(
                'transform',
                `translate(${this.#w / 2 + this.#padding.left},${this.#h / 2 + this.#padding.top})`
            );

        this.#vis = this.#container.append('g');

        svg.append("g")
            .attr("transform", "translate(" + (this.#w + this.#padding.left + this.#padding.right) + "," + ((this.#h / 2) + this.#padding.top) + ")")
            .append("path")
            .attr("d", "M-" + (this.#r * .15) + ",0L0," + (this.#r * .05) + "L0,-" + (this.#r * .05) + "Z")
            .style({"fill": "black"});
        this.#container.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 60)
            .style({"fill": "white", "cursor": "pointer"});
        this.#container.append("text")
            .attr("x", 0)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .text("SPIN")
            .style({"font-weight": "bold", "font-size": "30px"});
    }

    #createPieChart() {
        const pie = d3.layout.pie().sort(null).value(() => 1);
        const arc = d3.svg.arc().outerRadius(this.#r);

        const arcs = this.#vis
            .selectAll('g.slice')
            .data(pie(this.#data))
            .enter()
            .append('g')
            .attr('class', 'slice');

        arcs
            .append('path')
            .attr('fill', (d, i) => this.#color(i))
            .attr('d', d => arc(d));

        arcs
            .append('text')
            .attr('transform', d => {
                d.innerRadius = 0;
                d.outerRadius = this.#r;
                d.angle = (d.startAngle + d.endAngle) / 2;
                return `rotate(${(d.angle * 180) / Math.PI - 90})translate(${d.outerRadius - 10})`;
            })
            .attr('text-anchor', 'end')
            .text((d, i) => `${this.#data[i].wadName}: ${this.#data[i].wadLevel}`);

    }

    spin() {
        if (this.#oldpick.length === this.#data.length) {
            console.log('done');
            this.#container.on('click', null);
            return;
        }
        const ps = 360 / this.#data.length;
        const rng = Math.floor(Math.random() * 1440) + 360;

        this.#rotation = Math.round(rng / ps) * ps;

        this.#picked = Math.round(this.#data.length - (this.#rotation % 360) / ps);
        this.#picked = this.#picked >= this.#data.length ? this.#picked % this.#data.length : this.#picked;
        if (this.#oldpick.indexOf(this.#picked) !== -1) {
            d3.select(this).call(() => this.spin());
            return;
        } else {
            this.#oldpick.push(this.#picked);
        }
        this.#rotation += 90 - Math.round(ps / 2);
        return new Promise((resolve) => {
            this.#vis
                .transition()
                .duration(3000)
                .attrTween('transform', () => this.#rotTween())
                .each('end', () => {
                    d3.select(".slice:nth-child(" + (this.#picked + 1) + ") path").attr("fill", "#111");
                    this.#oldrotation = this.#rotation;
                    this.#container.on("click", () => this.spin());
                    resolve(this.#data[this.#picked]);
                });
        });
    }

    #rotTween() {
        const i = d3.interpolate(this.#oldrotation % 360, this.#rotation);
        return function (t) {
            return `rotate(${i(t)})`;
        };
    }
}
