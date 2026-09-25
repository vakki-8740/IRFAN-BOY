import React, { useState, useRef } from 'react';
import { navigate } from '../router.js';
import { Store, readFileAsDataURL } from '../store.js';

const CONFIG = {
    deposit: {
        title: 'Deposit Ticket',
        sub: 'Verify your deposit problem, we will help you right away.',
        problems: ['Pending', 'Reject', 'Processing', 'Not Received in Game Account'],
        upload: 'Upload Payment Image',
        amount: true,
        amountWord: 'Deposit'
    },
    withdraw: {
        title: 'Withdrawal Ticket',
        sub: 'Verify your withdrawal problem, we will help you right away.',
        problems: ['Pending', 'Reject', 'Processing', 'Not Received in Bank Account'],
        upload: 'Upload Withdrawal Issue Image',
        amount: true,
        amountWord: 'Withdrawal'
    },
    email: {
        title: 'Email Verification Ticket',
        sub: 'Fill in the details for email verification.',
        problems: null,
        upload: 'Upload Issue Image',
        verify: true
    },
    other: {
        title: 'Support Ticket',
        sub: 'Write your problem in detail, we will help you right away.',
        problems: null,
        upload: null
    }
};

function compressImageToDataURL(dataUrl, maxSide, quality) {
    return new Promise(function (resolve) {
        if (!dataUrl) { resolve(''); return; }
        var im = new Image();
        im.onload = function () {
            try {
                var w = im.naturalWidth || im.width;
                var h = im.naturalHeight || im.height;
                if (!w || !h) { resolve(dataUrl); return; }
                var scale = Math.min(1, maxSide / Math.max(w, h));
                var cw = Math.max(1, Math.round(w * scale));
                var ch = Math.max(1, Math.round(h * scale));
                var canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, cw, ch);
                ctx.drawImage(im, 0, 0, cw, ch);
                var out = canvas.toDataURL('image/jpeg', quality);
                if (!out || out.indexOf('data:image/jpeg') !== 0) { resolve(dataUrl); return; }
                resolve(out);
            } catch (e) {
                resolve(dataUrl);
            }
        };
        im.onerror = function () { resolve(dataUrl); };
        im.src = dataUrl;
    });
}

export default function Contact({ type }) {
    const cfg = CONFIG[type] || CONFIG.other;
    const finalType = CONFIG[type] ? type : 'other';

    const [form, setForm] = useState({
        name: '', phone: '', email: '', game_pass: '',
        problem: '', amount: '', verify_email: '', issue: ''
    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRef = useRef(null);

    function set(key) {
        return function (e) { setForm({ ...form, [key]: e.target.value }); };
    }

    function showError(msg) {
        setError(msg);
        setSending(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function onFileChange(e) {
        var f = e.target.files[0];
        if (f && f.type.indexOf('image/') === 0) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    }

    function removeFile() {
        setFile(null);
        setPreview('');
        if (inputRef.current) inputRef.current.value = '';
    }

    function submit(e) {
        e.preventDefault();
        setError('');

        var name = form.name.trim();
        var phone = form.phone.trim();
        var email = form.email.trim();
        var gamePass = form.game_pass.trim();
        var problem = cfg.problems ? form.problem.trim() : '';
        var amount = cfg.amount ? form.amount.trim() : '';
        var verifyEmail = cfg.verify ? form.verify_email.trim() : '';
        var issue = form.issue.trim();

        if (name === '' || phone === '' || email === '' || gamePass === '') {
            return showError('Please fill all required fields (User Name, Mobile, Email, Game Password).');
        }
        if (cfg.problems && problem === '') {
            return showError('Please select your problem.');
        }
        if (cfg.amount && amount === '') {
            return showError('Please enter amount.');
        }
        if (cfg.verify && verifyEmail === '') {
            return showError('Email ID is required for verification.');
        }
        if (cfg.upload && !file) {
            return showError('Please upload an image (JPG/PNG/WebP, max 5MB).');
        }
        if (file) {
            var okExt = ['jpg', 'jpeg', 'png', 'webp'];
            var ext = (file.name.split('.').pop() || '').toLowerCase();
            if (okExt.indexOf(ext) === -1 || file.size > 5 * 1024 * 1024) {
                return showError('Image upload failed. Please use JPG/PNG/WebP (max 5MB).');
            }
        }

        setSending(true);

        var save = function (imageData) {
            try {
                var startTicket = function (dataUrl) {
                    Store.addTicket({
                        type: finalType,
                        name: name,
                        mobile: phone,
                        email: email,
                        game_pass: gamePass,
                        problem: problem,
                        amount: amount,
                        verify_email: verifyEmail,
                        image: dataUrl || '',
                        issue: issue
                    });
                    try {
                        Store.startRealtime();
                        Store.sync();
                    } catch (err) { }
                    setTimeout(function () {
                        setSending(false);
                        setSuccess(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 700);
                };
                compressImageToDataURL(imageData, 1280, 0.72)
                    .then(startTicket)
                    .catch(function () { startTicket(imageData); });
            } catch (err) {
                showError('Something went wrong. Please try again.');
            }
        };

        if (file) {
            readFileAsDataURL(file).then(save).catch(function () {
                showError('Image could not be read. Please try another image.');
            });
        } else {
            save('');
        }
    }

    return (
        <section className="page">
            <a href="#/" className="back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Back
            </a>

            {success ? (
                <div className="success-box">
                    <div className="card-icon green big">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4 10-10" /></svg>
                    </div>
                    <h2>Request Received!</h2>
                    <p>Your request has been received by our team. We will contact you soon.</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="#/tickets" className="btn btn-primary">Track My Ticket</a>
                        <a href="#/" className="btn btn-secondary">Back to Home</a>
                    </div>
                </div>
            ) : (
                <>
                    <h1>{cfg.title}</h1>
                    <p className="sub">{cfg.sub}</p>

                    {error ? <div className="error-box">{error}</div> : null}

                    <form className="form" onSubmit={submit} noValidate>
                        <label>User Name <span>*</span></label>
                        <input type="text" placeholder="Your user name" value={form.name} onChange={set('name')} required />

                        <label>Enter Mobile Number <span>*</span></label>
                        <input type="tel" placeholder="Mobile number" value={form.phone} onChange={set('phone')} required />

                        <label>Enter Email ID <span>*</span></label>
                        <input type="email" placeholder="Your email ID" value={form.email} onChange={set('email')} required />

                        <label>Enter Game Account Password <span>*</span></label>
                        <input type="password" placeholder="Game account password" value={form.game_pass} onChange={set('game_pass')} required />

                        {cfg.problems ? (
                            <>
                                <label>Select Your Problem <span>*</span></label>
                                <select value={form.problem} onChange={set('problem')} required>
                                    <option value="">-- Select Problem --</option>
                                    {cfg.problems.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </>
                        ) : null}

                        {cfg.amount ? (
                            <>
                                <label>Enter {cfg.amountWord} Amount <span>*</span></label>
                                <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={set('amount')} required />
                            </>
                        ) : null}

                        {cfg.verify ? (
                            <>
                                <label>Enter Your Email ID (For Verification) <span>*</span></label>
                                <input type="email" placeholder="Email ID for verification" value={form.verify_email} onChange={set('verify_email')} required />
                            </>
                        ) : null}

                        {cfg.upload ? (
                            <>
                                <label>{cfg.upload} <span>*</span></label>
                                {file ? (
                                    <div className="upload-preview" style={{ display: 'flex' }}>
                                        <img src={preview} alt="Preview" />
                                        <button type="button" className="preview-remove" aria-label="Remove" onClick={removeFile}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="upload-box" style={{ display: 'flex' }}>
                                        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} hidden />
                                        <div className="upload-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M4 17v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" /></svg>
                                        </div>
                                        <span className="upload-title">Tap to Upload Image</span>
                                        <span className="upload-hint">JPG, PNG or WebP (max 5MB)</span>
                                    </label>
                                )}
                            </>
                        ) : null}

                        <label>Issue Detail</label>
                        <textarea rows="4" placeholder="Write your problem in detail (optional)..." value={form.issue} onChange={set('issue')}></textarea>

                        <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
                            {sending ? 'Sending...' : 'Submit Request'}
                        </button>
                    </form>
                </>
            )}

            <div className={'loading-overlay' + (sending ? ' show' : '')}>
                <div className="loading-card">
                    <div className="spinner"></div>
                    <p className="loading-title">Sending Request</p>
                    <p className="loading-sub">Please wait, do not close this page...</p>
                </div>
            </div>
        </section>
    );
}
