import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Mentions légales · RoadMates" };

// Contact address for privacy requests; set it in the environment before launch.
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function LegalPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 text-sm leading-relaxed md:px-8">
      <Link href="/" className="text-muted underline">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold">Mentions légales et données personnelles</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Éditeur</h2>
        <p>
          RoadMates est un projet étudiant non commercial, gratuit, réservé aux élèves du CESI
          (adresse @viacesi.fr). Éditeur : Yoan Poux-Bories.
          {CONTACT && (
            <>
              {" "}
              Contact : <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>.
            </>
          )}
        </p>
        <p>
          Hébergement : Vercel Inc. (application) et Supabase (base de données, région Union
          européenne). Cartes : OpenFreeMap / OpenStreetMap. Adresses : Géoplateforme IGN.
          Itinéraires : OpenRouteService. Emails : Resend.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Horaires estimés, hors trafic</h2>
        <p>
          Les durées et horaires proposés sont calculés en circulation fluide, sans bouchons ni
          trafic en temps réel. Ils peuvent être faux. RoadMates est une aide à l&apos;organisation :
          conducteur et passager restent responsables de confirmer l&apos;horaire et le point de
          rendez-vous entre eux, via la messagerie. Le covoiturage est gratuit et se fait sous la
          seule responsabilité des participants.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Données collectées et finalités</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Email scolaire : identifiant du compte, jamais visible des autres utilisateurs.</li>
          <li>Pseudo ou prénom : affiché aux membres de ta classe.</li>
          <li>
            Adresses (domicile, travail, école) : chiffrées en base, utilisées uniquement côté
            serveur pour calculer les covoiturages compatibles. Elles ne sont jamais montrées aux
            autres ; seuls les points de rendez-vous proposés le sont.
          </li>
          <li>Trajets habituels, demandes, covoiturages, messages et notifications.</li>
          <li>Abonnements aux notifications push de tes appareils, si tu les actives.</li>
        </ul>
        <p>
          Base légale : exécution du service que tu demandes en créant un compte. Aucune donnée
          n&apos;est vendue ni utilisée à des fins publicitaires. Les mots de passe sont hachés et
          ne sont jamais lisibles.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Durées de conservation</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte, adresses, trajets, demandes et messages : jusqu&apos;à la suppression du compte.</li>
          <li>Notifications : 90 jours.</li>
          <li>Itinéraires calculés (chiffrés) : cache technique, sans lien avec ton identité.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Tes droits</h2>
        <p>
          Tu peux consulter et modifier tes données dans l&apos;application et supprimer ton compte à
          tout moment depuis <strong>Compte</strong> : la suppression est immédiate et définitive.
          Pour toute autre demande (accès, rectification, opposition), contacte l&apos;éditeur. Tu
          peux aussi saisir la CNIL (cnil.fr).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Cookies et stockage local</h2>
        <p>
          Seuls des cookies strictement nécessaires sont utilisés (session de connexion). Le thème
          choisi et la fermeture du guide d&apos;installation sont gardés dans ton navigateur. Aucun
          traceur publicitaire ni outil de mesure d&apos;audience.
        </p>
      </section>
    </main>
  );
}
