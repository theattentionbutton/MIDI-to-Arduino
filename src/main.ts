import { Midi, Track } from "@tonejs/midi";
import * as Tone from "tone";
import { convertMelody, saveFile } from "./utils";
import cf from "campfire.js";

const [playSymbol, stopSymbol] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path><path d="M0 0h24v24H0z" fill="none"></path></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"></path><path d="M6 6h12v12H6z"></path></svg>`,
];

const trackSelect = cf.select('#tracks') as HTMLSelectElement;
const playToggle = cf.select('#play-toggle') as HTMLButtonElement;
const output = cf.select("#output-ta") as HTMLTextAreaElement;
const downloadBtn = cf.select("#download-btn") as HTMLButtonElement;
const dropperLabel = cf.select("#file-dropper #file-dropper-text") as HTMLDivElement;

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
    const synth = new Tone.Synth().toDestination();
    track.notes.forEach((note) => {
        console.log(note);
        const now = Tone.now();
        try {
            synth.triggerAttackRelease(note.name, note.duration, note.time + now);
        } catch (err) {
            console.error(err);
        }
    });
}

const trackId = () => parseInt(trackSelect.value || '0');

const parseFile = async (file: File) => {
    const data = await toArrayBuffer(file);
    const midi = new Midi(data);

    updateTracks(midi);
    console.log(trackId());
    const notes = midi.tracks[trackId()].notes;
    const code = convertMelody(notes);
    output.value = code;

    const currentFilename = file.name.split(".")[0] + ".ino";
    downloadBtn.onclick = () => saveFile(currentFilename, code);

    playToggle.onclick = async () => {
        console.log('playing', trackId());
        const track = midi.tracks[trackId()];
        await playMidi(track);
    }

    [downloadBtn, playToggle].forEach(e => e.removeAttribute("disabled"));
}