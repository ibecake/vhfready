import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "VHFReady — radio exam practice" },
    {
      name: "description",
      content:
        "Mobile-first practice for radio qualifications: questions, flashcards, and mock exams.",
    },
    { tagName: "link", rel: "canonical", href: "https://vhfready.com/" },
  ];
}

export default function Home() {
  return (
    <section className="hero">
      <p className="muted" style={{ margin: 0, letterSpacing: "0.04em" }}>
        Study on the water, or on the sofa
      </p>
      <h1>VHFReady</h1>
      <p>
        Fast, simple exam practice for radio qualifications — questions,
        flashcards, and mock papers on your phone.
      </p>
      <div className="cta-row">
        <Link className="btn" to="/signup">
          Create account
        </Link>
        <Link className="btn btn-secondary" to="/ireland/harec">
          Irish HAREC (draft)
        </Link>
      </div>
    </section>
  );
}
