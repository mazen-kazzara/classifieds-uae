"use client";

import { useState } from "react";

export default function NewAdPage() {
  const [phone, setPhone] = useState("971");
  const [submissionId, setSubmissionId] = useState("");
  const [language, setLanguage] = useState<"EN" | "AR">("EN");
  const [category, setCategory] = useState("Vehicles");
  const [text, setText] = useState("");

  const [contactPhone, setContactPhone] = useState("971");
  const [contactEmail, setContactEmail] = useState("");

  const [img1, setImg1] = useState<File | null>(null);
  const [img2, setImg2] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);

  async function start() {
    setLoading(true);
    setOut(null);
    try {
      const res = await fetch("/api/submissions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      setOut(data);
      if (data.ok) setSubmissionId(data.submissionId);
    } finally {
      setLoading(false);
    }
  }

  async function saveLanguage() {
    if (!submissionId) return;
    setLoading(true);
    setOut(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/language`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      setOut(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function saveCategory() {
    if (!submissionId) return;
    setLoading(true);
    setOut(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      setOut(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function saveText() {
    if (!submissionId) return;
    setLoading(true);
    setOut(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setOut(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function saveContact() {
    if (!submissionId) return;
    setLoading(true);
    setOut(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPhone, contactEmail }),
      });
      setOut(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function uploadOne(file: File, position: 1 | 2) {
    const form = new FormData();
    form.append("file", file);
    form.append("position", String(position));

    const res = await fetch(`/api/submissions/${submissionId}/images`, {
      method: "POST",
      body: form,
    });

    return res.json();
  }

  async function uploadImages() {
    if (!submissionId) return;
    setLoading(true);
    setOut(null);
    try {
      let lastResp: any = null;
      if (img1) lastResp = await uploadOne(img1, 1);
      if (img2) lastResp = await uploadOne(img2, 2);
      setOut(lastResp);
    } finally {
      setLoading(false);
    }
  }

  async function createPayment() {
    if (!submissionId) return;
    setLoading(true);
    setOut(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      setOut(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>New Ad (Test Flow)</h1>

      <div style={{ marginTop: 16 }}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (must start 971)"
        />
        <button onClick={start} disabled={loading}>
          1) Start
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <input
          value={submissionId}
          readOnly
          style={{ width: 500 }}
          placeholder="Submission ID"
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
        >
          <option value="EN">EN</option>
          <option value="AR">AR</option>
        </select>
        <button onClick={saveLanguage} disabled={!submissionId}>
          2) Save Language
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="Vehicles">Vehicles</option>
          <option value="Real Estate">Real Estate</option>
          <option value="Electronics">Electronics</option>
        </select>
        <button onClick={saveCategory} disabled={!submissionId}>
          3) Save Category
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ad text"
          rows={4}
          style={{ width: 400 }}
        />
        <br />
        <button onClick={saveText} disabled={!submissionId}>
          4) Save Text
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <input
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="Contact Phone"
        />
        <input
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="Contact Email"
        />
        <button onClick={saveContact} disabled={!submissionId}>
          5) Save Contact
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <input type="file" onChange={(e) => setImg1(e.target.files?.[0] ?? null)} />
        <input type="file" onChange={(e) => setImg2(e.target.files?.[0] ?? null)} />
        <button onClick={uploadImages} disabled={!submissionId}>
          6) Upload Images
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={createPayment} disabled={!submissionId}>
          7) Create Payment
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <pre>{JSON.stringify(out, null, 2)}</pre>
      </div>
    </main>
  );
}