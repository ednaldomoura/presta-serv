import { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import './App.css'

function App() {
  const [form, setForm] = useState({
    apartamento: '',
    nome: '',
    documento: '',
    autorizadoPor: '',
    data: '',
    horaEntrada: '',
    horaSaida: '',
    empresa: '',
    servico: '',
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [cadastros, setCadastros] = useState([]);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const videoRef = useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCamera = async (facingMode) => {
    setCameraActive(true);
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      try {
        // Suporte para facingMode como string ou objeto (compatibilidade máxima)
        let constraints = typeof facingMode === 'object'
          ? { video: { facingMode } }
          : { video: { facingMode } };
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // fallback para video: true
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        videoRef.current.srcObject = stream;
      } catch (err) {
        alert('Erro ao acessar a câmera: ' + err.message);
      }
    }
  };

  const handleStopCamera = () => {
    setCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedPhoto(dataUrl);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCadastros([...cadastros, { ...form, foto: capturedPhoto, horaSaida: '' }]);
    alert('Cadastro realizado!');
    setForm({
      apartamento: '',
      nome: '',
      documento: '',
      autorizadoPor: '',
      data: '',
      horaEntrada: '',
      horaSaida: '',
      empresa: '',
      servico: '',
    });
    setCapturedPhoto(null);
  };

  const handleRemove = (index) => {
    setCadastros(cadastros.filter((_, i) => i !== index));
  };

  const handleBaixa = (index) => {
    const now = new Date();
    const horaSaida = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCadastros(cadastros.map((c, i) =>
      i === index ? { ...c, baixa: true, horaSaida } : c
    ));
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(cadastros.map(({baixa, ...c}) => ({...c, baixa: baixa ? 'Sim' : 'Não'})));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cadastros.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Cadastros', 14, 14);
    doc.autoTable({
      head: [[
        'Nome', 'Apartamento', 'Documento', 'Autorizado por', 'Data', 'Entrada', 'Saída', 'Empresa', 'Serviço', 'Baixa'
      ]],
      body: cadastros.map(c => [
        c.nome, c.apartamento, c.documento, c.autorizadoPor, c.data, c.horaEntrada, c.horaSaida, c.empresa, c.servico, c.baixa ? 'Sim' : 'Não'
      ]),
      startY: 22
    });
    doc.save('cadastros.pdf');
  };

  // Salvar cadastros no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('cadastros', JSON.stringify(cadastros));
  }, [cadastros]);

  // Carregar cadastros do localStorage ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('cadastros');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCadastros(parsed.map(c => ({
            apartamento: c.apartamento || '',
            nome: c.nome || '',
            documento: c.documento || '',
            autorizadoPor: c.autorizadoPor || '',
            data: c.data || '',
            horaEntrada: c.horaEntrada || '',
            horaSaida: c.horaSaida || '',
            empresa: c.empresa || '',
            servico: c.servico || '',
            foto: c.foto || null,
            baixa: !!c.baixa
          })));
        }
      } catch {
        setCadastros([]);
      }
    }
  }, []);

  return (
    <div className="container">
      <h1>Cadastro Prestador de Serviço</h1>
      <form onSubmit={handleSubmit} className="formulario">
        <input name="apartamento" placeholder="Apartamento" value={form.apartamento} onChange={handleChange} required />
        <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required />
        <input name="documento" placeholder="Documento" value={form.documento} onChange={handleChange} required />
        <input name="autorizadoPor" placeholder="Quem autorizou" value={form.autorizadoPor} onChange={handleChange} required />
        <input name="data" type="date" value={form.data} onChange={handleChange} required />
        <input name="horaEntrada" type="time" placeholder="Hora Entrada" value={form.horaEntrada} onChange={handleChange} required />
        <input name="horaSaida" type="time" placeholder="Hora Saída" value={form.horaSaida} onChange={handleChange} required disabled />
        <input name="empresa" placeholder="Empresa" value={form.empresa} onChange={handleChange} required />
        <input name="servico" placeholder="Serviço" value={form.servico} onChange={handleChange} required />
        <div style={{ margin: '10px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleCamera({ exact: 'environment' })}>
            Câmera Traseira (facing back)
          </button>
          <button type="button" onClick={() => handleCamera({ exact: 'user' })}>
            Câmera Frontal (facing front)
          </button>
          <button type="button" onClick={() => handleCamera('environment')}>
            Câmera Traseira (compatibilidade)
          </button>
          <button type="button" onClick={() => handleCamera('user')}>
            Câmera Frontal (compatibilidade)
          </button>
          {cameraActive && (
            <button type="button" onClick={handleStopCamera}>Fechar Câmera</button>
          )}
        </div>
        {cameraActive && (
          <div style={{textAlign: 'center'}}>
            <video ref={videoRef} autoPlay style={{ width: 300, height: 200, border: '1px solid #ccc', display: 'block', margin: '0 auto 8px auto' }} />
            <button type="button" onClick={handleCapturePhoto} style={{background: '#2563eb', color: '#fff', marginBottom: 8}}>Tirar Foto</button>
            {capturedPhoto && (
              <div>
                <img src={capturedPhoto} alt="Foto capturada" style={{width: 120, height: 'auto', borderRadius: 8, border: '1px solid #888', margin: '8px auto'}} />
              </div>
            )}
          </div>
        )}
        <button type="submit">Cadastrar</button>
      </form>
      {cadastros.length > 0 && (
        <div style={{marginTop: 32}}>
          <h2 style={{textAlign: 'center', color: '#2563eb'}}>Cadastros Realizados</h2>
          <div style={{display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16}}>
            <button onClick={handleExportCSV} style={{background: '#0ea5e9'}}>Exportar CSV</button>
            <button onClick={handleExportPDF} style={{background: '#f59e42'}}>Exportar PDF</button>
            <button type="button" onClick={() => setShowRelatorio(true)} style={{background: '#6366f1', color: '#fff'}}>Relatório dos Registros</button>
          </div>
          <ul style={{listStyle: 'none', padding: 0}}>
            {cadastros.map((c, i) => (
              <li key={i} style={{background: '#f1f5f9', borderRadius: 8, margin: '10px 0', padding: 12, position: 'relative', opacity: c.baixa ? 0.5 : 1}}>
                <strong>{c.nome}</strong> - Apt: {c.apartamento} <br/>
                Documento: {c.documento} <br/>
                Autorizado por: {c.autorizadoPor} <br/>
                Data: {c.data} | Entrada: {c.horaEntrada} | Saída: {c.horaSaida} <br/>
                Empresa: {c.empresa} <br/>
                Serviço: {c.servico}
                {c.foto && <div><img src={c.foto} alt="Foto" style={{width: 80, height: 'auto', borderRadius: 6, border: '1px solid #888', margin: '8px 0'}} /></div>}
                <div style={{position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4}}>
                  <button onClick={() => handleRemove(i)} style={{background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer'}}>Remover</button>
                  {!c.baixa && <button onClick={() => handleBaixa(i)} style={{background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer'}}>Dar Baixa</button>}
                </div>
                {c.baixa && <span style={{color: '#059669', fontWeight: 'bold'}}>Baixa realizada</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {showRelatorio && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{background: '#fff', borderRadius: 10, padding: 24, maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 2px 16px rgba(0,0,0,0.2)'}}>
            <h2 style={{textAlign: 'center', color: '#2563eb'}}>Relatório dos Registros</h2>
            <button onClick={() => setShowRelatorio(false)} style={{position: 'absolute', top: 16, right: 32, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer'}}>Fechar</button>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 16}}>
              <thead>
                <tr style={{background: '#f1f5f9'}}>
                  <th>Nome</th>
                  <th>Apartamento</th>
                  <th>Documento</th>
                  <th>Autorizado por</th>
                  <th>Data</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Empresa</th>
                  <th>Serviço</th>
                  <th>Baixa</th>
                  <th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {cadastros.map((c, i) => (
                  <tr key={i} style={{opacity: c.baixa ? 0.5 : 1}}>
                    <td>{c.nome}</td>
                    <td>{c.apartamento}</td>
                    <td>{c.documento}</td>
                    <td>{c.autorizadoPor}</td>
                    <td>{c.data}</td>
                    <td>{c.horaEntrada}</td>
                    <td>{c.horaSaida}</td>
                    <td>{c.empresa}</td>
                    <td>{c.servico}</td>
                    <td>{c.baixa ? 'Sim' : 'Não'}</td>
                    <td>{c.foto && <img src={c.foto} alt="Foto" style={{width: 40, height: 'auto', borderRadius: 4, border: '1px solid #888'}} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
