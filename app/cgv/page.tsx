import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"

export default function CGVPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Header />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-16">
                    Conditions Générales de <span className="text-orange-500">Vente</span>
                </h1>

                <div className="prose prose-invert max-w-none text-zinc-400 leading-relaxed space-y-8">
                    <p className="border-l-4 border-orange-500 pl-6 py-2 italic font-medium">
                        Les présentes conditions générales de vente (CGV) régissent les ventes en ligne de fruits, légumes et produits d'épicerie sur le site internet <strong>powerprimeur.com</strong>, exploitées par la société <strong>POWER</strong>.
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 1 - Mentions Légales et Objet</h2>
                        <p>
                            Les présentes Conditions Générales de Vente sont conclues d'une part par la société <strong>POWER</strong>, immatriculée sous le <strong>SIRET 944 504 794 00016</strong>, dont le siège social est situé au <strong>114 Rue Paul Vaillant Couturier, 94140 Alfortville</strong>, ci-après dénommée "le Vendeur", et d'autre part, toute personne physique ou morale souhaitant procéder à un achat via le site internet <em>powerprimeur.com</em>, ci-après dénommée "l'Acheteur".
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 2 - Caractéristiques des produits</h2>
                        <p>
                            Les produits proposés sont exclusivement des denrées alimentaires à très courte durée de conservation (fruits, légumes, compositions fraîches).<br/>
                            Chaque produit est accompagné d'un descriptif. Les photographies du catalogue sont les plus fidèles possible mais ne peuvent assurer une similitude parfaite avec le produit offert, notamment en raison de la nature organique, de la saisonnalité et du calibrage aléatoire des fruits et légumes. <br/>
                            Le poids des produits vendus à la coupe ou au détail peut légèrement varier compte tenu de la tolérance légale en vigueur relative à la pesée artisanale.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 3 - Prix</h2>
                        <p>
                            Les prix figurant sur les fiches produits du catalogue internet sont des prix en Euros (€) toutes taxes comprises (TTC) tenant compte de la TVA applicable au jour de la commande.<br/>
                            La société POWER se réserve le droit de modifier ses prix à tout moment en fonction des cours du marché. Toutefois, les produits seront facturés sur la base des tarifs en vigueur au moment de l'enregistrement de la commande. Les prix indiqués ne comprennent pas les frais de livraison, facturés en supplément.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 4 - Commandes et Disponibilité</h2>
                        <p>
                            L'Acheteur passe commande sur le site web. Toute commande vaut acceptation de l'acheteur concernant les prix et descriptions des produits disponibles à la vente.<br/>
                            En raison de la spécificité des produits frais, nos offres de produits sont valables dans un contexte de rotation rapide des stocks. En cas d'indisponibilité brutale d'un produit (arrivage abîmé ou rupture) après passation de la commande, l'Acheteur en sera informé. Nous nous réservons le droit de remplacer un produit manquant par un produit de qualité et de prix équivalents ou supérieurs consécutivement à un appel téléphonique.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 5 - Modalités de paiement</h2>
                        <p>
                            Le règlement des achats s'effectue intégralement à la commande par carte bancaire. Les paiements sont sécurisés par la technologie Stripe. Aucun produit ne pourra être conditionné ou expédié sans la validation stricte de la transaction bancaire.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 6 - Livraison</h2>
                        <p>
                            Les livraisons sont faites à l'adresse indiquée sur le bon de commande qui ne peut être que dans la zone géographique ciblée (94, 75, 92, 91 et départements adjacents spécifiés).<br/>
                            Il appartient à l'Acheteur de s'assurer de sa présence aux horaires de livraison prévus afin de réceptionner les marchandises frigorifiques ou périssables. En cas d'absence, la responsabilité de la société POWER ne saurait être engagée quant à la dégradation des denrées fraîches attendant d'être récupérées.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 7 - Exception au Droit de rétractation</h2>
                        <p className="text-zinc-300">
                            <strong>ATTENTION :</strong> Conformément aux dispositions de <strong>l'article L.221-28 4° du Code de la consommation</strong>, <strong>le droit de rétractation de 14 jours ne s'applique pas aux contrats de fourniture de biens susceptibles de se détériorer ou de se périmer rapidement.</strong> <br/>
                            Par conséquent, l'Acheteur ne dispose d'aucun droit d'annulation ni de retour pour l'ensemble des commandes de fruits, légumes, et produits ultra-frais expédiés via le site <em>powerprimeur.com</em>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 8 - Réclamations</h2>
                        <p>
                            Malgré notre intransigeance sur la qualité, si un produit livré s'avérait défectueux à l'ouverture, toute réclamation devra obligatoirement nous être adressée, photographies nettes à l'appui, dans un <strong>délai strict de 24 heures après la livraison</strong> en raison de la nature périssable des denrées. Passé ce délai, aucune réclamation ne pourra être acceptée pour cause de vieillissement naturel de l'aliment.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 9 - Responsabilité</h2>
                        <p>
                            La société POWER, dans le processus de vente à distance, n'est tenue que par une obligation de moyens. Sa responsabilité ne pourra être engagée pour un dommage résultant de l'utilisation du réseau Internet tel que perte de données, intrusion, virus ou rupture de service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Article 10 - Litiges</h2>
                        <p>
                            Les présentes conditions de vente sont soumises à la loi française. En cas de non règlement amiable d'un litige, le Tribunal compétent sera celui correspondant à la juridiction dont dépend le siège social de la société POWER.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    )
}
