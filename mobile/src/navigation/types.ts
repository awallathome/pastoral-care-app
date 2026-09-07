export type RootStackParamList = {
  Main: undefined;
  PersonDetail: { personId: string };
  VisitDetail: { visitId: string };
  AddVisit: { personId?: string };
  AddPerson: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  People: undefined;
};
