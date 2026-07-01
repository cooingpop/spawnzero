import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with us",
};

export default function Contact() {
  return (
    <section>
      <h1>Contact Us</h1>
      <p>Feel free to reach out to us at <strong>support@example.com</strong> or call us at <strong>(123) 456-7890</strong>.</p>
      <p>Our office hours are from <strong>9 AM to 5 PM</strong> Monday to Friday.</p>
    </section>
  );
}
