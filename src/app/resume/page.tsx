import type { Metadata } from "next";
import Link from "next/link";
import { education, experience, internship, profile, project, skills } from "@/content/profile";
import "./resume.css";

export const metadata: Metadata = { title: "Resume" };

/** Resume mode: the building folded back into one drawing sheet. Also printed to the PDF. */
export default function Resume() {
  return (
    <main className="resume">
      <nav className="resume-bar no-print">
        <Link href="/" className="btn-quiet">
          ← Back to the building
        </Link>
        <a href={profile.resumePdf} className="btn-primary" download>
          Download PDF
        </a>
      </nav>

      <article className="sheet">
        <header className="sheet-head">
          <h1 className="display sheet-name">{profile.name}</h1>
          <p className="sheet-role">
            {profile.role} · {profile.place}
          </p>
          <p className="sheet-contact">
            {profile.contact.map((c) => (
              <a key={c.href} href={c.href}>
                {c.label}
              </a>
            ))}
          </p>
        </header>

        <section className="sheet-section">
          <h2 className="label">Profile</h2>
          <p>{profile.summary}</p>
        </section>

        <div className="sheet-cols">
          <div>
            <section className="sheet-section">
              <h2 className="label">Experience</h2>
              {experience.map((j) => (
                <div key={j.id} className="sheet-job">
                  <p className="sheet-job-head">
                    <strong>{j.role}</strong> · {j.org}, {j.place}
                  </p>
                  <p className="sheet-when">{j.period}</p>
                  <ul>
                    {j.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
            <section className="sheet-section">
              <h2 className="label">Internship</h2>
              <div className="sheet-job">
                <p className="sheet-job-head">
                  <strong>{internship.role}</strong> · {internship.org}, {internship.place}
                </p>
                <p className="sheet-when">{internship.period}</p>
                <ul>
                  {internship.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <div>
            <section className="sheet-section">
              <h2 className="label">Education</h2>
              {education.map((e) => (
                <div key={e.degree} className="sheet-job">
                  <p className="sheet-job-head">
                    <strong>{e.degree}</strong>
                  </p>
                  <p>{e.school}</p>
                  {e.note ? <p className="sheet-note">{e.note}</p> : null}
                  <p className="sheet-when">
                    {e.period} · {e.score}
                  </p>
                </div>
              ))}
            </section>
            <section className="sheet-section">
              <h2 className="label">Skills</h2>
              <dl className="sheet-skills">
                {skills.map((s) => (
                  <div key={s.name}>
                    <dt>{s.name}</dt>
                    <dd>{s.items}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="sheet-section">
              <h2 className="label">Project</h2>
              <p className="sheet-job-head">
                <strong>{project.title}</strong>
              </p>
              <ul>
                {project.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <footer className="sheet-title-block">
          <div>
            <span>Project</span>
            <b className="hand">{profile.name}</b>
          </div>
          <div>
            <span>Drawn by</span>
            <b className="hand">{profile.initials}</b>
          </div>
          <div>
            <span>Scale</span>
            <b className="hand">N.T.S.</b>
          </div>
          <div>
            <span>Sheet</span>
            <b className="hand">R-001</b>
          </div>
        </footer>
      </article>
    </main>
  );
}
