import React from 'react';
import { navigate } from '../router.js';

const CARDS = [
    {
        icon: 'assets/icon-deposit.jpg',
        title: 'Deposit Problem',
        sub: 'Money not added? Get an instant solution.',
        type: 'deposit'
    },
    {
        icon: 'assets/icon-withdraw.jpg',
        title: 'Withdrawal Problem',
        sub: 'Withdrawal delayed or pending? Report it here.',
        type: 'withdraw'
    },
    {
        icon: 'assets/icon-email.jpg',
        title: 'Email Verification',
        sub: 'Email not verified? Get help here.',
        type: 'email'
    },
    {
        icon: 'assets/icon-other.jpg',
        title: 'Other Query',
        sub: 'Any other question? We are listening.',
        type: 'other'
    }
];

const FAQS = [
    {
        q: 'How long does a deposit take to be added?',
        a: 'Deposits are usually added within 5-10 minutes. If it takes more than 15 minutes, please contact support.',
        open: true
    },
    {
        q: 'When will my withdrawal arrive?',
        a: 'Withdrawal requests are processed within 24 hours. Please wait for bank working hours.'
    },
    {
        q: 'Email verification link not received?',
        a: 'Check your spam/junk folder. If it still does not arrive, submit the support form and our team will verify and help you.'
    },
    {
        q: 'How fast does support reply?',
        a: 'We are available 24x7 and usually reply within 10-30 minutes.'
    }
];

function Chev() {
    return (
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    );
}

export default function Home() {
    return (
        <>
            <section className="hero">
                <img src="assets/banner.jpg" alt="Banner" className="banner-img" />
                <h1>How can we help you?</h1>
                <p className="sub">Our support team is ready to help you 24x7.</p>
            </section>

            <section className="cards">
                {CARDS.map((c) => (
                    <a key={c.type} className="card" href={'#/contact?type=' + c.type}>
                        <img src={c.icon} alt="" className="card-icon-img" />
                        <h3>{c.title}</h3>
                        <p>{c.sub}</p>
                    </a>
                ))}
            </section>

            <section className="faq" id="faq">
                <h2>Frequently Asked Questions</h2>
                <div className="faq-list">
                    {FAQS.map((f) => (
                        <details className="faq-item" key={f.q} open={!!f.open}>
                            <summary>
                                {f.q}
                                <Chev />
                            </summary>
                            <p>{f.a}</p>
                        </details>
                    ))}
                </div>
            </section>
        </>
    );
}
