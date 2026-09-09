import { Link } from "react-router";
import type { Route } from "./+types/ireland.harec";

export function meta() {
  return [
    { title: "Irish HAREC practice — VHFReady" },
    {
      name: "description",
      content:
        "Practice for the Irish HAREC Amateur Station Licence using owner-supplied question banks and mock papers.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://vhfready.com/ireland/harec",
    },
  ];
}

export default function IrelandHarec() {
  return (
    <main className="page">
      <h1>Irish HAREC</h1>
      <p className="muted">
        Draft qualification page for supplied HAREC JSON content. This is not a
        marine VHF SRC syllabus page — that content has not been supplied.
      </p>
      <section className="panel stack">
        <p>
          Study with the imported question bank, matching flashcards, and five
          predefined mock papers. Educational wording is shown exactly as
          supplied.
        </p>
        <div className="cta-row">
          <Link className="btn" to="/signup">
            Start practising
          </Link>
          <Link className="btn btn-secondary" to="/mocks">
            View mock exams
          </Link>
        </div>
      </section>
    </main>
  );
}
