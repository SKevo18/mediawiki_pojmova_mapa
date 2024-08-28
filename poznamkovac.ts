import vykreslitMapu from "./src/pojmova_mapa";
import rezimSustredenia from "./src/rezim_sustredenia";

globalThis.addEventListener("load", async () => {
    rezimSustredenia();
    await vykreslitMapu();
});
