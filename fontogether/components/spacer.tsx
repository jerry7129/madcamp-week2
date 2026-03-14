export default function Spacer(props: { weight?: number }) {
  const componentWeight = props.weight ?? 1;
  return (
    <div style={{ flexGrow: componentWeight }}></div>
  )
}
