"""Export U²-Net-p to ONNX with DYNAMIC height/width, so input size is a runtime
parameter rather than baked into the Resize ops as rembg's 320-only file has it."""
import torch, sys
sys.path.insert(0, ".")
from u2net import U2NETP

net = U2NETP(3, 1)
net.load_state_dict(torch.load("u2netp.pth", map_location="cpu"))
net.eval()

dummy = torch.zeros(1, 3, 320, 320)
torch.onnx.export(
    net, dummy, "u2netp-dynamic.onnx",
    input_names=["input"], output_names=["d0", "d1", "d2", "d3", "d4", "d5", "d6"],
    dynamic_axes={"input": {2: "h", 3: "w"}, **{f"d{i}": {2: "h", 3: "w"} for i in range(7)}},
    opset_version=17, do_constant_folding=True, dynamo=False,
)
import onnx
m = onnx.load("u2netp-dynamic.onnx"); onnx.checker.check_model(m)
print("input:", [d.dim_param or d.dim_value for d in m.graph.input[0].type.tensor_type.shape.dim])
print("outputs:", [o.name for o in m.graph.output])
