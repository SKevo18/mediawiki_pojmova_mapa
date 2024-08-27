import type { Edge, Node, Options } from "vis-network";
import { DataSet } from "vis-data/peer";
import { Network } from "vis-network/peer";

export class MwPojmovaMapa {
    private poznamkyElement: HTMLElement;
    private elementMapy: HTMLElement;
    private mapa: { vrcholy: Node[]; hrany: Edge[] };
    private pojmova_mapa: Network | null = null;

    private static readonly farbySkupin = [
        [255, 102, 102], // červená
        [102, 255, 102], // zelená
        [102, 102, 255], // modrá
        [255, 255, 102], // žltá
        [255, 102, 255], // fialová
        [102, 255, 255], // cyanová
        [255, 178, 102], // oranžová
        [178, 255, 102], // limetková
        [102, 178, 255], // modrá (ako obloha)
    ];

    constructor(poznamkyElement: HTMLElement, elementMapy: HTMLDivElement) {
        this.poznamkyElement = poznamkyElement;
        this.elementMapy = elementMapy;
        this.mapa = { vrcholy: [], hrany: [] };
    }

    public inicializovat(): void {
        this.vytvoritDataMapy();
        this.vykreslitMapu();
    }

    private vytvoritDataMapy(): void {
        const nadpisy = this.poznamkyElement.querySelectorAll("h1, h2, h3, h4, h5, h6") as NodeListOf<HTMLHeadingElement>;
        let posledneNadpisy: number[] = [];
        let indexSkupiny = 0;
        let farbySkupin: { [key: number]: number } = {};

        let korenovyNadpis = document.getElementById("firstHeading")?.innerText || "";
        this.mapa.vrcholy.push({
            id: 1,
            label: korenovyNadpis,
            color: this.generovatFarbu(indexSkupiny),
        });
        farbySkupin[0] = indexSkupiny;

        nadpisy.forEach((nadpis, index) => {
            const aktualnyLevel = this.ziskatLevelNadpisu(nadpis);
            const idVrchola = index + 2;
            const nazov = nadpis.querySelector(".mw-headline")?.textContent || "";

            let idRodica = 1;
            for (let lvl = aktualnyLevel - 1; lvl >= 0; lvl--) {
                if (posledneNadpisy[lvl] !== undefined) {
                    idRodica = posledneNadpisy[lvl];
                    break;
                }
            }

            if (farbySkupin[idRodica] === undefined) {
                indexSkupiny++;
                farbySkupin[idRodica] = indexSkupiny;
            }
            const color = this.generovatFarbu(farbySkupin[idRodica]);

            this.mapa.vrcholy.push({
                id: idVrchola,
                title: this.obsahNadpisu(nadpis),
                label: nazov,
                color: color,
            });
            this.mapa.hrany.push({ from: idRodica, to: idVrchola });

            posledneNadpisy[aktualnyLevel] = idVrchola;
            posledneNadpisy = posledneNadpisy.slice(0, aktualnyLevel + 1);
        });
    }

    private vykreslitMapu(): void {
        const sirkaZobrazenia = window.innerWidth;
        const jeSirokeZobrazenie = sirkaZobrazenia > 768;

        const dataSiete = {
            nodes: new DataSet(this.mapa.vrcholy),
            edges: new DataSet(this.mapa.hrany),
        };

        const nastavenia: Options = {
            autoResize: true,
            clickToUse: true,
            interaction: {
                hover: true,
                dragNodes: false,
                dragView: false,
                zoomView: false,
            },
            nodes: {
                shape: "box",
                widthConstraint: {
                    maximum: 200,
                },
                margin: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10,
                },
                labelHighlightBold: true,
            },
            edges: {
                width: 1.0,
                arrows: {
                    to: {
                        enabled: true,
                    },
                },
            },
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: jeSirokeZobrazenie ? "UD" : "LR",
                    sortMethod: "directed",
                    nodeSpacing: jeSirokeZobrazenie ? 200 : 40,
                    levelSeparation: jeSirokeZobrazenie ? 80 : 140,
                    shakeTowards: "roots",
                },
            },
            physics: {
                hierarchicalRepulsion: {
                    nodeDistance: 150,
                },
            },
            height: "400px",
        };

        this.pojmova_mapa = new Network(this.elementMapy, dataSiete, nastavenia);

        this.nastavitUdalosti();
        this.pridatInfoText();
    }

    private nastavitUdalosti(): void {
        if (!this.pojmova_mapa) return;

        this.pojmova_mapa.on("click", (parametre) => {
            const titulokBunky = this.mapa.vrcholy.find((vrchol) => vrchol.id === parametre?.nodes?.[0])?.label;
            if (!titulokBunky) return;

            window.location.hash = "";
            window.location.hash = `#${titulokBunky.replaceAll(" ", "_")}`;
        });
    }

    private pridatInfoText(): void {
        let info = document.createElement("small");
        info.style.fontSize = "12px";
        info.innerHTML += "Kliknutím na vrchol sa presuniete na príslušnú sekciu.";

        this.elementMapy.parentNode?.insertBefore(info, this.elementMapy.nextSibling);
    }

    private obsahNadpisu(nadpisElement: HTMLHeadingElement): HTMLDivElement {
        let novyNadpis = nadpisElement.cloneNode(true) as HTMLElement;
        novyNadpis.innerHTML = (novyNadpis.querySelector(".mw-headline") as HTMLHeadingElement).outerHTML;
        novyNadpis.getElementsByTagName("span")?.[0]?.removeAttribute("id"); // odstráni duplicitné ID

        novyNadpis.style.marginTop = "0";
        novyNadpis.style.textAlign = "center";

        let obsahDiv = document.createElement("div");
        obsahDiv.appendChild(novyNadpis);

        const __pridavajObsah = (element: Element | null): void => {
            if (element === null || ["H1", "H2", "H3", "H4", "H5", "H6"].includes(element.tagName)) {
                return;
            }

            if (element.querySelector(":scope > h1, h2, h3, h4, h5, h6")) {
                __pridavajObsah(element.firstElementChild);
            } else {
                obsahDiv.appendChild(element.cloneNode(true));
                __pridavajObsah(element.nextElementSibling);
            }
        };

        __pridavajObsah(nadpisElement.nextElementSibling);
        obsahDiv = this.skratitDiv(obsahDiv);

        obsahDiv.style.fontSize = "12px";
        obsahDiv.style.maxWidth = "50vw";
        obsahDiv.style.maxHeight = "50vh";
        return obsahDiv;
    }

    private skratitDiv(element: HTMLDivElement, maxDlzka: number = 2000): HTMLDivElement {
        let novyElement = document.createElement(element.tagName) as HTMLDivElement;
        let pocitadloDlzok = 0;

        for (let child of Array.from(element.childNodes)) {
            pocitadloDlzok += child.textContent?.length || 0;

            if (pocitadloDlzok > maxDlzka) {
                novyElement.appendChild(document.createTextNode("..."));
                break;
            }

            novyElement.appendChild(child.cloneNode(true));
        }

        return novyElement;
    }

    private ziskatLevelNadpisu(nadpis: Element): number {
        return parseInt(nadpis.tagName.substring(1), 10);
    }

    private generovatFarbu(indexSkupiny: number): string {
        const indexFarby = indexSkupiny % MwPojmovaMapa.farbySkupin.length;
        const [r, g, b] = MwPojmovaMapa.farbySkupin[indexFarby];
        return `rgb(${r}, ${g}, ${b})`;
    }
}

globalThis.addEventListener("load", () => {
    const poznamkyElement = document.querySelector("#mw-content-text .mw-parser-output") as HTMLElement;
    const elementMapy = document.getElementById("mapa") as HTMLDivElement;

    if (elementMapy !== null && poznamkyElement !== null) {
        const pojmovaMapa = new MwPojmovaMapa(poznamkyElement, elementMapy);
        pojmovaMapa.inicializovat();
    } else {
        console.log("Na stránke sa nenachádza pojmová mapa.");
    }
});
