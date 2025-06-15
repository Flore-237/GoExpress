import { ImageSourcePropType } from 'react-native';

export const getAgencyLogo = (agencyId: string): ImageSourcePropType => {
  switch(agencyId) {
    case 'bucca_voyage':
      return require('../assets/images/BucaLogo.jpg');
    case 'general_express_voyage':
      return require('../assets/images/generaleLogo.jpg');
    case 'touristique_express_voyage':
      return require('../assets/images/trouristiqueLogo.jpg');
    case 'tresor_voyage':
      return require('../assets/images/logo.png');
    default:
      return require('../assets/images/GoExpress.png');
  }
};

export const getAgencyBanner = (agencyId: string): ImageSourcePropType => {
  switch(agencyId) {
    case 'bucca_voyage':
      return require('../assets/images/BucaVoyage.jpg');
    case 'general_express_voyage':
      return require('../assets/images/GeneraleExpress.png');
    case 'touristique_express_voyage':
      return require('../assets/images/touristique.jpg');
    case 'tresor_voyage':
      return require('../assets/images/TresorVoyage.jpeg');
    default:
      return require('../assets/images/busFondBon.jpeg');
  }
}; 