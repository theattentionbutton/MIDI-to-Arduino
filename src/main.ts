import { Midi, Track } from "@tonejs/midi";
import * as Tone from "tone";
import { convertMelody, saveFile } from "./utils";
import cf from "campfire.js";

const trackSelect = cf.select('#tracks') as HTMLSelectElement;
const playToggle = cf.select('#play-toggle') as HTMLButtonElement;
const output = cf.select("#output-ta") as HTMLTextAreaElement;
const downloadBtn = cf.select("#download-btn") as HTMLButtonElement;
const dropperLabel = cf.select("#file-dropper #file-dropper-text") as HTMLDivElement;
const nameField = cf.select('#track-name') as HTMLInputElement;
const buzzerPin = cf.select('#buzzer-pin') as HTMLInputElement;

window.addEventListener('DOMContentLoaded', (_) => {
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        dropperLabel.textContent = "Reading files not supported by this browser";
        return;
    }

    const dropper = cf.select('#file-dropper') as HTMLInputElement;
    const input = cf.select("#file-dropper input") as HTMLInputElement;

    dropper.addEventListener("dragover", () => dropper.classList.add("hover"));
    dropper.addEventListener("dragleave", () => dropper.classList.remove("hover"));
    dropper.addEventListener("drop", () => dropper.classList.remove("hover"));

    input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        if (!files) return;

        if (files.length > 0) {
            const file = files[0];
            dropperLabel.textContent = file.name;
            parseFile(file);
        }
    });

    output.value = '';
})

const updateTracks = (midi: Midi) => {
    let options: string[] = [];
    midi.tracks.forEach((track, i) => {
        options.push(cf.html`<option value=${i}> ${i + 1}. ${track.name} </option>`);
    });
    trackSelect.innerHTML = options.join("\n");
};

const toArrayBuffer = (f: File) => new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        if (!e.target) return reject("No target found for FileReader");
        if (!(e.target.result instanceof ArrayBuffer)) return reject('Uploaded file wasn\'t ArrayBuffer or didn\'t exist.');
        resolve(e.target.result);
    }

    reader.readAsArrayBuffer(f);
});

let started = false;
const playMidi = async (track: Track) => {
    if (!started) {
        await Tone.start();
        started = true;
    }

    const synth = new Tone.Synth({
        oscillator: {
            partialCount: 0,
            type: 'square',
            volume: -8
        }
    }).toDestination();
    for (const note of track.notes) {
        const now = Tone.now();
        synth.triggerAttackRelease(note.name, note.duration, note.time + now);
        console.log(note.name, Math.round(note.duration * 1000));
    };
}

const trackId = () => parseInt(trackSelect.value || '0');
const playing = new cf.Store(false);

playing.on('update', (v) => playToggle.innerHTML = v ? 'Playing...' : 'Test MIDI');

const parseFile = async (file: File) => {
    const data = await toArrayBuffer(file);
    const midi = new Midi(data);

    const name = nameField.value.trim() || file.name.split('.')[0];
    updateTracks(midi);
    console.log(trackId());
    const notes = midi.tracks[trackId()].notes;
    const code = convertMelody(notes, name, buzzerPin.value);
    output.value = code;

    const filename = name + ".h";
    downloadBtn.onclick = () => saveFile(filename, code);

    playToggle.onclick = async () => {
        if (playing.value) return;
        console.log('playing', trackId());
        const track = midi.tracks[trackId()];
        playing.update(true);
        await playMidi(track);
        setTimeout(() => playing.update(false), track.duration * 1000 + 100);
    }

    [downloadBtn, playToggle].forEach(e => e.removeAttribute("disabled"));
}