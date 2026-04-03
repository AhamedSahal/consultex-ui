import * as Yup from 'yup';

export const CompanySchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Company name is too short')
    .max(100, 'Company name is too long')
    .required('Company name is required'),
  industry: Yup.string().required('Please select an industry'),
  industry_other: Yup.string().when('industry', {
    is: 'Other',
    then: (schema) => schema.required('Please specify the industry')
  }),
  country: Yup.string().required('Please select a country'),
  status: Yup.string().required('Please select a status'),
  notes: Yup.string().nullable()
});
