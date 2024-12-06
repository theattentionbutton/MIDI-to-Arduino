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
#ifndef {{ guard }}
#define {{ guard }}

const int {{ name }}_notes[{{ length }}][2] = {
    {{ notes }}
};

void play_{{ name }}(int buzzer) {
    for (int i = 0; i < sizeof({{ name }}_notes) / sizeof(* {{ name }}_notes); i++) {
        tone(buzzer, {{ name }}_notes[i][0], {{ name }}_notes[i][1]);
        delay({{ name }}_notes[i][1] + 10);
    }
}

#endif

{{ optional }}
`);

const runtimeTpl = cf.template(`\
void setup() { play_{{ name }}({{ buzzer }}); }
void loop() {}`
);

const convertMelody = (arr: Note[], name = 'song', buzzer = '') => {
    const freq = (note: Note) => Math.round(Frequency(note.name).toFrequency());
    const d = (note: Note) => Math.round(note.duration * 1000);
    const optional = buzzer ? runtimeTpl({ buzzer }) : '';

    const notes = arr
        .map((note) => `{${freq(note)}, ${d(note)}}`)
        .join(',\n    ');

    return sourceTemplate({
        notes,
        name,
        optional,
        length: arr.length.toString(),
        guard: name.toUpperCase() + "_H"
    }).trim();
}

export { convertMelody, saveFile };
