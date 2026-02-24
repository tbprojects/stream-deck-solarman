interface SvgElement {
	type: string;
	attrs: Record<string, string | number>;
	content?: string;
}

export class SvgBuilder {
	private elements: SvgElement[] = [];
	readonly size: number;

	constructor(size: number) {
		this.size = size;
	}

	rect(x: number, y: number, w: number, h: number, fill: string, opacity = 1): this {
		this.elements.push({
			type: "rect",
			attrs: { x, y, width: w, height: h, fill, "fill-opacity": opacity },
		});
		return this;
	}

	strokeRect(x: number, y: number, w: number, h: number, stroke: string, strokeWidth: number): this {
		this.elements.push({
			type: "rect",
			attrs: { x, y, width: w, height: h, fill: "none", stroke, "stroke-width": strokeWidth },
		});
		return this;
	}

	text(
		content: string,
		x: number,
		y: number,
		fontSize: number,
		fill: string,
		anchor: "start" | "middle" | "end" = "middle",
		strokeColor?: string,
		strokeWidth?: number,
	): this {
		const attrs: Record<string, string | number> = {
			x,
			y,
			"font-size": fontSize,
			"font-family": "Arial, sans-serif",
			"font-weight": "bold",
			fill,
			"text-anchor": anchor,
			"dominant-baseline": "central",
		};
		if (strokeColor) {
			attrs["stroke"] = strokeColor;
			attrs["stroke-width"] = strokeWidth ?? 1;
			attrs["paint-order"] = "stroke";
		}
		this.elements.push({ type: "text", attrs, content });
		return this;
	}

	build(): string {
		const size = this.size;
		const inner = this.elements
			.map((el) => {
				const attrsStr = Object.entries(el.attrs)
					.map(([k, v]) => `${k}="${v}"`)
					.join(" ");
				if (el.type === "text") {
					return `<text ${attrsStr}>${escapeXml(el.content ?? "")}</text>`;
				}
				return `<${el.type} ${attrsStr}/>`;
			})
			.join("\n");

		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n${inner}\n</svg>`;
		return `data:image/svg+xml;base64,${btoa(encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))}`;

	}
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
