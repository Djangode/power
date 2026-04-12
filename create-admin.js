const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('power2024!', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@powerprimeur.com' },
    update: { 
        password: hashedPassword, 
        role: 'admin' 
    },
    create: {
      email: 'admin@powerprimeur.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Power'
    }
  });
  
  console.log('✅ Compte Administrateur généré avec succès !');
  console.log(`Email : ${user.email}`);
  console.log(`Mot de passe : power2024!`);
}

main()
  .catch(e => {
    console.error('Erreur :', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
