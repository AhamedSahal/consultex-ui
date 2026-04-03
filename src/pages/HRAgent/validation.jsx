import * as Yup from 'yup';

export const createAgentSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Too short')
    .max(100, 'Too long')
    .required('Please enter an agent name'),
  purpose: Yup.string().required('Please enter an agent purpose'),
  country: Yup.string().required('Please select a country'),
  status: Yup.string().required('Please select a status'),
  strict_playbook: Yup.boolean(),
  playbook_file: Yup.mixed()
    .test('fileRequired', 'Please upload a playbook file', (value) => !!value)
});

