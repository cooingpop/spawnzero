import { Metadata } from 'next';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with our team',
};

export default function ContactPage() {
  return (
    <div>
      <h1>Contact Us</h1>
      <p>Thank you for your interest. Please fill out the form below to get in touch with our team.</p>
      <form>
        <label htmlFor="name">Name:</label>
        <input type="text" id="name" name="name" required />
        <label htmlFor="email">Email:</label>
        <input type="email" id="email" name="email" required />
        <label htmlFor="message">Message:</label>
        <textarea id="message" name="message" required></textarea>
        <button type="submit">Send Message</button>
      </form>
    </div>
  );
}