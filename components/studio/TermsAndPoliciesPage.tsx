"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";

type PolicyTab = "terms" | "privacy" | "community";

const tabs: { id: PolicyTab; label: string }[] = [
  { id: "terms", label: "Terms of Service" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "community", label: "Community Guidelines" },
];

const lastUpdated = "June 10, 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="scroll-mt-24">
      <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/65">{children}</div>
    </section>
  );
}

function PolicyBody({ tab }: { tab: PolicyTab }) {
  if (tab === "terms") {
    return (
      <div className="space-y-8">
        <Section title="1. Agreement">
          <p>
            By accessing or using Rizflow Studio (&quot;Rizflow,&quot; &quot;we,&quot;
            &quot;us&quot;), you agree to these Terms of Service. If you do not agree,
            do not use the service.
          </p>
        </Section>
        <Section title="2. The service">
          <p>
            Rizflow provides AI-assisted music creation, studio recording tools, stem
            separation, music-to-video generation, and Hooks — short-form videos paired
            with tracks you select or create.
          </p>
          <p>
            Features may change, be limited by plan, or require third-party services
            (including ElevenLabs, Runway, Replicate, and cloud storage providers).
          </p>
        </Section>
        <Section title="3. Your account">
          <p>
            You are responsible for your account credentials and all activity under your
            account. You must provide accurate information and be at least 13 years old
            (or the minimum age required in your country).
          </p>
        </Section>
        <Section title="4. Content you create and upload">
          <p>
            You retain ownership of original content you upload or generate, subject to
            any rights granted to third-party AI providers under their terms when you use
            their features.
          </p>
          <p>
            By publishing a Hook or making content public on Rizflow, you grant us a
            non-exclusive, worldwide license to host, display, stream, and distribute
            that content solely to operate and promote the service.
          </p>
          <p>
            You represent that you have the rights to any audio, video, images, and lyrics
            you upload, and that your content does not infringe others&apos; rights.
          </p>
        </Section>
        <Section title="5. Acceptable use">
          <p>You may not use Rizflow to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Violate laws or others&apos; intellectual property or privacy rights</li>
            <li>Upload harmful, abusive, hateful, or sexually exploitative material</li>
            <li>Impersonate others or misrepresent AI-generated work as human without disclosure where required</li>
            <li>Attempt to reverse engineer, scrape, or overload our systems</li>
            <li>Circumvent usage limits, credits, or access controls</li>
          </ul>
        </Section>
        <Section title="6. AI-generated output">
          <p>
            AI outputs may be similar to other users&apos; results and may be inaccurate
            or incomplete. You are responsible for reviewing outputs before publishing or
            commercial use. We do not guarantee uniqueness, quality, or fitness for a
            particular purpose.
          </p>
        </Section>
        <Section title="7. Subscriptions and credits">
          <p>
            Paid plans, credits, and promotional offers are described at purchase. Fees are
            non-refundable except where required by law. We may change pricing with
            reasonable notice.
          </p>
        </Section>
        <Section title="8. Termination">
          <p>
            You may stop using Rizflow at any time. We may suspend or terminate access if
            you breach these terms or if required for legal or security reasons. Upon
            termination, your right to use the service ends, but provisions that should
            survive will remain in effect.
          </p>
        </Section>
        <Section title="9. Disclaimers and liability">
          <p>
            Rizflow is provided &quot;as is&quot; without warranties of any kind. To the
            fullest extent permitted by law, Rizflow and its affiliates are not liable for
            indirect, incidental, or consequential damages arising from your use of the
            service.
          </p>
        </Section>
        <Section title="10. Contact">
          <p>
            Questions about these terms:{" "}
            <a href="mailto:legal@rizflow.com" className="text-white underline-offset-2 hover:underline">
              legal@rizflow.com
            </a>
          </p>
        </Section>
      </div>
    );
  }

  if (tab === "privacy") {
    return (
      <div className="space-y-8">
        <Section title="1. Overview">
          <p>
            This Privacy Policy explains how Rizflow collects, uses, and shares
            information when you use Rizflow Studio, including Hooks, the music library,
            and AI creation tools.
          </p>
        </Section>
        <Section title="2. Information we collect">
          <p>
            <strong className="font-medium text-white/85">Account information</strong> —
            name, email, and authentication data when you sign up or sign in.
          </p>
          <p>
            <strong className="font-medium text-white/85">Content you provide</strong> —
            prompts, generated tracks, uploaded audio and video, captions, comments, and
            profile details.
          </p>
          <p>
            <strong className="font-medium text-white/85">Usage data</strong> — pages
            visited, features used, play counts, likes, saves, and device/browser
            information.
          </p>
          <p>
            <strong className="font-medium text-white/85">Payment data</strong> — processed
            by our payment provider; we do not store full card numbers.
          </p>
        </Section>
        <Section title="3. How we use information">
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide, maintain, and improve Rizflow</li>
            <li>Generate AI music and video through integrated providers</li>
            <li>Host and deliver your Hooks and library tracks</li>
            <li>Personalize your experience and show relevant content in Explore</li>
            <li>Send service updates, security alerts, and support responses</li>
            <li>Enforce our terms and protect against abuse</li>
          </ul>
        </Section>
        <Section title="4. Sharing">
          <p>We may share information with:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-white/85">Service providers</strong> —
              hosting, storage, analytics, authentication, and AI vendors that process
              data on our behalf
            </li>
            <li>
              <strong className="font-medium text-white/85">Other users</strong> — when
              you publish Hooks or interact publicly (display name, captions, comments)
            </li>
            <li>
              <strong className="font-medium text-white/85">Legal requests</strong> — when
              required by law or to protect rights and safety
            </li>
          </ul>
          <p>We do not sell your personal information.</p>
        </Section>
        <Section title="5. Storage and retention">
          <p>
            Content is stored on secure cloud infrastructure. We retain account and
            content data while your account is active and for a reasonable period
            afterward unless deletion is requested or required by law.
          </p>
        </Section>
        <Section title="6. Your choices">
          <p>
            You can update account details, delete tracks from your library, and request
            account deletion by contacting support. Some data may remain in backups for a
            limited time.
          </p>
          <p>
            You may disable comments on individual Hooks before publishing. Browser
            settings can limit cookies; some features may not work without them.
          </p>
        </Section>
        <Section title="7. Security">
          <p>
            We use industry-standard measures to protect data, but no system is fully secure.
            Report suspected issues to{" "}
            <a href="mailto:security@rizflow.com" className="text-white underline-offset-2 hover:underline">
              security@rizflow.com
            </a>
            .
          </p>
        </Section>
        <Section title="8. International users">
          <p>
            If you access Rizflow from outside your home country, your information may be
            processed in jurisdictions with different data protection laws.
          </p>
        </Section>
        <Section title="9. Children">
          <p>
            Rizflow is not directed at children under 13. We do not knowingly collect
            personal information from children under 13.
          </p>
        </Section>
        <Section title="10. Contact">
          <p>
            Privacy questions:{" "}
            <a href="mailto:privacy@rizflow.com" className="text-white underline-offset-2 hover:underline">
              privacy@rizflow.com
            </a>
          </p>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Section title="Our community">
        <p>
          Hooks and Explore are built for creators sharing music and short clips. These
          guidelines help keep Rizflow welcoming, creative, and safe for everyone.
        </p>
      </Section>
      <Section title="Be respectful">
        <p>
          Treat other creators with respect. Harassment, threats, hate speech, and
          targeted abuse are not allowed — in comments, captions, or published content.
        </p>
      </Section>
      <Section title="Original work and rights">
        <p>
          Only upload audio and video you have the right to use. Do not publish copyrighted
          material you do not own or license. When remixing or using public songs on
          Hooks, follow applicable licensing rules in your region.
        </p>
      </Section>
      <Section title="Safe content">
        <p>Do not post content that:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Depicts violence, self-harm, or illegal activity</li>
          <li>Is sexually explicit or exploits minors</li>
          <li>Spreads malware, spam, or deceptive links</li>
          <li>Impersonates artists, brands, or other users</li>
        </ul>
      </Section>
      <Section title="AI transparency">
        <p>
          AI-generated music and video are welcome on Rizflow. Do not mislead others about
          the nature of AI-assisted work where disclosure is required by law or platform
          policy.
        </p>
      </Section>
      <Section title="Hooks and comments">
        <p>
          Creators may disable comments on their Hooks. If comments are enabled, keep
          discussion on-topic and constructive. We may remove comments or restrict accounts
          that violate these guidelines.
        </p>
      </Section>
      <Section title="Reporting">
        <p>
          If you see content that violates these guidelines, contact{" "}
          <a href="mailto:trust@rizflow.com" className="text-white underline-offset-2 hover:underline">
            trust@rizflow.com
          </a>{" "}
          with a link to the Hook and a brief description. We review reports and may remove
          content or take action on accounts.
        </p>
      </Section>
      <Section title="Enforcement">
        <p>
          Violations may result in content removal, feature restrictions, or permanent
          account suspension. Serious or repeated violations may be reported to relevant
          authorities.
        </p>
      </Section>
    </div>
  );
}

export function TermsAndPoliciesPage() {
  const [tab, setTab] = useState<PolicyTab>("terms");

  return (
    <StudioSubpageShell
      title="Terms and Policies"
      description="Terms of service, privacy policy, and community guidelines for Rizflow Studio."
    >
      <div className="mx-auto max-w-3xl pb-12">
        <p className="text-xs text-white/40">Last updated {lastUpdated}</p>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/[0.08] pb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-white text-[#1a1a1a]"
                  : "bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white/90"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          <PolicyBody tab={tab} />
        </div>

        <div className="mt-12 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
          <p className="text-sm text-white/55">
            Need help understanding these policies? Visit{" "}
            <Link href="/help" className="font-medium text-white hover:underline">
              Help
            </Link>{" "}
            or email{" "}
            <a href="mailto:support@rizflow.com" className="font-medium text-white hover:underline">
              support@rizflow.com
            </a>
            .
          </p>
        </div>
      </div>
    </StudioSubpageShell>
  );
}
