import {useState} from "react";
import MicRecorder from 'mic-recorder-to-mp3';
import './App.css'

function App() {
  const [languageCode, setLanguageCode] = useState("en-US");
  const [audioFile, setAudioFile] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState({
    loading: false,
    text: null,
  });
  const [isRecording, setIsRecording] = useState(false);

  const [recorder, setRecorder] = useState(null);
  const backendUrl = '3.79.115.34'

  const startRecording = () => {
    const recorderInstance = new MicRecorder({ bitRate: 128 });
    setRecorder(recorderInstance);
    recorderInstance.start().catch((error) => {
      console.error("Error while trying to record audio: ", error);
    });
    setIsRecording(true)
  };

  const stopRecording = () => {
    if (recorder) {
      recorder
          .stop()
          .getMp3()
          .then(([buffer]) => {
            const file = new File(buffer, "recording.mp3", {
              type: "audio/mp3",
              lastModified: Date.now(),
            });
            setAudioFile(file);
            setAudioSrc(URL.createObjectURL(file))
            setIsRecording(false)
          })
          .catch((err) => {
            console.error("Error while stopping recording and getting the MP3: ", err);
          });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTranscriptionStatus({ loading: false, text: null });

    if (!audioFile) {
      alert("Please choose an audio file.");
      return;
    }

    const formData = new FormData();
    formData.append("languageCode", languageCode);
    formData.append("audioFile", audioFile);

    try {
      setTranscriptionStatus({ loading: true, text: null });

      const response = await fetch(`http://${backendUrl}:8080/transcribe/start`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setTranscriptionStatus({ loading: false, text: "Error occurred: " + response.statusText });
        return;
      }

      const jobId = await response.text();
      const pollingInterval = 300;

      async function checkStatus() {
        const statusResponse = await fetch(`http://${backendUrl}:8080/transcribe/status?jobId=${jobId}`);

        if (!statusResponse.ok) {
          setTranscriptionStatus({ loading: false, text: "Error occurred: " + statusResponse.status });
          return;
        }

        const result = await statusResponse.json();
        if (result.status === "IN_PROGRESS") {
          setTimeout(checkStatus, pollingInterval);
        } else if (result.status === "COMPLETED") {
          setTranscriptionStatus({ loading: false, text: result.result });
        } else {
          setTranscriptionStatus({ loading: false, text: "Error: Transcription job failed." });
        }
      }

      await checkStatus();
    } catch (ex) {
      setTranscriptionStatus({ loading: false, text: "Error occurred: " + ex.message });
    }
  };

  return (
      <div className="App">
        <div className="card">
          <h1>Transcribe Audio</h1>
          <div className="controls">
            <div
                onClick={isRecording ? stopRecording : startRecording}
                className={`icon ${isRecording ? "recording" : "not-recording"}`}
            >
              <img
                  src="https://icons.iconarchive.com/icons/icons8/windows-8/64/Music-Microphone-icon.png"
                  width="50"
                  alt={isRecording ? "Stop Recording" : "Start Recording"}
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              Language:
              <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
              >
                <option value="en-US">English</option>
                <option value="ru-RU">Russian</option>
                <option value="it-IT">Italian</option>
                <option value="ar-SA">Arabic</option>
              </select>
            </label>
            <audio id="audio-player" src={audioSrc} controls />
          </div>
          <form onSubmit={handleSubmit}>
            <button
                type="submit"
                disabled={!audioFile || transcriptionStatus.loading}
            >
              Transcribe
            </button>
          </form>
          {transcriptionStatus.loading && (
              <div className="loading">Please wait, processing...</div>
          )}
          {transcriptionStatus.text !== null && (
              <div className="result-card">
                <h2>Transcription Result</h2>
                <p>{transcriptionStatus.text}</p>
              </div>
          )}
        </div>
      </div>
  );
}

export default App;