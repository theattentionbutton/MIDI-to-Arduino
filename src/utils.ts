import { Note } from "@tonejs/midi/dist/Note";
import { Frequency } from "tone";
import cf from "campfire.js";

const saveFile = (filename: string, data: string) => {
    const blob = new Blob([data], { type: "text/plain" });
    const elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
};

const sourceTemplate = cf.template(`\
const int {{ name }}_notes[{{ length }}][3] = {
    {{ notes }}
};

void play_{{ name }}(int buzzer) {
    for (int i = 0; i < sizeof({{ name }}_notes) / sizeof(* {{ name }}_notes); i++) {
        tone(buzzer, notes[i][0], notes[i][1]);
        delay(notes[i][2]);
    }
}

{{ optional }}
`);

const runtimeTpl = cf.template(`\
void setup() { play_{{ name }}({{ buzzer }}); }
void loop() {}`
);

const convertMelody = (arr: Note[], name = 'song', buzzer = '') => {
    const freq = (note: Note) => Math.round(Frequency(note.name).toFrequency());
    const d = (note: Note) => note.duration * 1000;
    const optional = buzzer ? runtimeTpl({ buzzer }) : '';

    const notes = arr
        .map((note) => `{${freq(note)}, ${d(note)}, ${d(note) + 5}}`)
        .join(',\n    ');

    return sourceTemplate({ notes, name, optional, length: notes.length.toString() }).trim();
}

export { convertMelody, saveFile };